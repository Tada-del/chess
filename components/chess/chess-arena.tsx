"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { Chessboard } from "react-chessboard";
import { Save, Sparkles, Undo2 } from "lucide-react";
import { AI_PERSONALITIES, STOCKFISH_ELO_STEP, STOCKFISH_MAX_ELO, STOCKFISH_MIN_ELO } from "@/lib/constants";

type ReviewResponse = {
  moves: Array<{
    moveNumber: number;
    color: "w" | "b";
    san: string;
    classification: string;
    centipawnLoss: number;
  }>;
  counts: Record<string, number>;
  accuracy: { white: number; black: number };
};

export function ChessArena({ userName, userId }: { userName: string; userId?: string }) {
  const [game, setGame] = useState(() => new Chess());
  const [opening, setOpening] = useState<{ code?: string; name?: string }>({});
  const [personality, setPersonality] = useState<(typeof AI_PERSONALITIES)[number]["key"]>("stockfish");
  const [stockfishElo, setStockfishElo] = useState(1400);
  const [premove, setPremove] = useState<{ source: string; target: string } | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState("Game started. You play White.");

  const boardPosition = game.fen();
  const history = useMemo(() => game.history({ verbose: true }), [game]);

  const updateOpening = async (nextGame: Chess) => {
    try {
      if (!nextGame.pgn()) {
        setOpening({});
        return;
      }

      const response = await fetch("/api/opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: nextGame.pgn() }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { code?: string; name?: string };
      setOpening(data);
    } catch (error) {
      console.error(error);
    }
  };

  const applyMove = (source: string, target: string, fen: string) => {
    const next = new Chess(fen);
    const move = next.move({ from: source, to: target, promotion: "q" });
    if (!move) return null;
    return next;
  };

  const triggerBotMove = async (currentGame: Chess) => {
    if (currentGame.isGameOver()) {
      setStatusMessage("Game over.");
      return;
    }

    setStatusMessage(`${AI_PERSONALITIES.find((entry) => entry.key === personality)?.label ?? "Bot"} is thinking...`);

    try {
      const response = await fetch("/api/bot-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: currentGame.fen(),
          personality,
          elo: stockfishElo,
        }),
      });

      if (!response.ok) {
        throw new Error("Bot move failed");
      }

      const data = (await response.json()) as { move: string };
      const botGame = applyMove(data.move.slice(0, 2), data.move.slice(2, 4), currentGame.fen());

      if (!botGame) {
        throw new Error("Bot attempted illegal move");
      }

      setGame(botGame);
      await updateOpening(botGame);

      if (premove && botGame.turn() === "w") {
        const premoveGame = applyMove(premove.source, premove.target, botGame.fen());
        setPremove(null);
        if (premoveGame) {
          setGame(premoveGame);
          await updateOpening(premoveGame);
          await triggerBotMove(premoveGame);
          return;
        }
      }

      setStatusMessage(botGame.isGameOver() ? "Game over." : "Your move.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to fetch AI move. Please try again.");
    } finally {
      // keep status updates in message pill without extra spinner state
    }
  };

  const onDrop = async ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) {
      return false;
    }

    if (game.turn() !== "w") {
      setPremove({ source: sourceSquare, target: targetSquare });
      setStatusMessage(`Premove queued: ${sourceSquare}-${targetSquare}`);
      return false;
    }

    const next = applyMove(sourceSquare, targetSquare, game.fen());
    if (!next) {
      return false;
    }

    setGame(next);
    await updateOpening(next);

    if (next.isGameOver()) {
      setStatusMessage("Game over.");
      return true;
    }

    await triggerBotMove(next);
    return true;
  };

  const undo = async () => {
    const next = new Chess(game.fen());
    if (!next.undo()) return;
    next.undo();
    setGame(next);
    setStatusMessage("Move undone.");
    await updateOpening(next);
  };

  const restart = () => {
    const next = new Chess();
    setGame(next);
    setOpening({});
    setReview(null);
    setPremove(null);
    setStatusMessage("Game started. You play White.");
  };

  const saveAndReview = async () => {
    if (history.length < 4) {
      setStatusMessage("Play a longer game before reviewing.");
      return;
    }

    const result = game.isCheckmate() ? (game.turn() === "w" ? "BLACK_WIN" : "WHITE_WIN") : game.isDraw() ? "DRAW" : "ABORTED";

    try {
      setStatusMessage("Generating game review...");

      const reviewResponse = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: game.pgn() }),
      });
      const reviewData = (await reviewResponse.json()) as ReviewResponse;
      setReview(reviewData);

      await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "BOT",
          timeControl: "rapid",
          whiteId: userId ?? null,
          blackId: null,
          whiteName: userName,
          blackName: AI_PERSONALITIES.find((entry) => entry.key === personality)?.label ?? "Stockfish",
          pgn: game.pgn(),
          result,
          openingEco: opening.code ?? null,
          openingName: opening.name ?? null,
          review: reviewData,
          moves: history,
        }),
      });

      setStatusMessage("Game saved. Review generated below.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not create review. Try again.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_340px]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-slate-700 bg-[#312e2b] p-4 shadow-2xl"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <div className="rounded-full bg-[#1f1d1a] px-3 py-1">Opening: {opening.name ? `${opening.code} ${opening.name}` : "Unknown"}</div>
          <div className="rounded-full bg-[#1f1d1a] px-3 py-1">Premove: {premove ? `${premove.source}-${premove.target}` : "None"}</div>
          <div className="rounded-full bg-[#1f1d1a] px-3 py-1">{statusMessage}</div>
        </div>

        <div className="mx-auto max-w-[640px]">
          <Chessboard
            options={{
              id: "royal-square-board",
              position: boardPosition,
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                void onDrop({ sourceSquare, targetSquare });
                return true;
              },
              boardStyle: { borderRadius: "12px", boxShadow: "0 18px 40px rgba(0,0,0,.4)" },
              darkSquareStyle: { backgroundColor: "#769656" },
              lightSquareStyle: { backgroundColor: "#eeeed2" },
              animationDurationInMs: 220,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={undo} className="inline-flex items-center gap-2 rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700/40">
            <Undo2 size={16} /> Undo
          </button>
          <button onClick={restart} className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700/40">
            New game
          </button>
          <button onClick={saveAndReview} className="inline-flex items-center gap-2 rounded-lg bg-[#81b64c] px-3 py-2 text-sm font-bold text-[#1a2f14] hover:bg-[#9dd25f]">
            <Save size={16} /> Save + Review
          </button>
        </div>
      </motion.section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-[#262421] p-4">
          <h3 className="mb-2 text-base font-bold text-white">Opponent AI</h3>
          <div className="space-y-2">
            {AI_PERSONALITIES.map((entry) => (
              <button
                key={entry.key}
                onClick={() => setPersonality(entry.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  personality === entry.key
                    ? "border-[#81b64c] bg-[#81b64c]/15 text-[#dff8be]"
                    : "border-slate-600 text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <div className="font-semibold">{entry.label}</div>
                <div className="text-xs text-slate-400">{entry.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
              <span>Stockfish Strength</span>
              <span>{stockfishElo} Elo</span>
            </div>
            <input
              type="range"
              min={STOCKFISH_MIN_ELO}
              max={STOCKFISH_MAX_ELO}
              step={STOCKFISH_ELO_STEP}
              value={stockfishElo}
              onChange={(event) => setStockfishElo(Number(event.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-[#262421] p-4">
          <h3 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-white">
            <Sparkles size={16} /> Game Review
          </h3>
          {!review ? (
            <p className="text-sm text-slate-400">Save a game to generate move-by-move quality classification.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(review.counts).map(([key, value]) => (
                  <div key={key} className="rounded-md border border-slate-600 px-2 py-1">
                    {key}: {value}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-300">Accuracy - White {review.accuracy.white}% / Black {review.accuracy.black}%</p>
              <ul className="max-h-52 space-y-1 overflow-y-auto text-xs">
                {review.moves.map((move, index) => (
                  <li key={`${move.moveNumber}-${move.san}-${index}`} className="rounded-md bg-slate-800/70 px-2 py-1">
                    {move.moveNumber}.{move.color === "w" ? "w" : "..."} {move.san} - {move.classification} ({move.centipawnLoss} CPL)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
