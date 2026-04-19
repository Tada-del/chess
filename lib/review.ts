import { Chess } from "chess.js";
import { getEngineBestMove } from "@/lib/stockfish-service";

export type MoveClassification =
  | "BRILLIANT"
  | "GREAT"
  | "BEST"
  | "EXCELLENT"
  | "GOOD"
  | "INACCURACY"
  | "MISTAKE"
  | "BLUNDER";

export type MoveReview = {
  moveNumber: number;
  color: "w" | "b";
  san: string;
  playedMoveUci: string;
  bestMoveUci: string;
  centipawnLoss: number;
  evalBefore: number;
  evalAfterPlayed: number;
  classification: MoveClassification;
};

export type ReviewSummary = {
  moves: MoveReview[];
  counts: Record<MoveClassification, number>;
  accuracy: {
    white: number;
    black: number;
  };
};

function classifyMove(cpl: number, isSacrifice: boolean, isBest: boolean): MoveClassification {
  if (isSacrifice && cpl <= 40) return "BRILLIANT";
  if (isBest && cpl <= 5) return "BEST";
  if (cpl <= 20) return "EXCELLENT";
  if (cpl <= 45) return "GOOD";
  if (cpl <= 90) return "INACCURACY";
  if (cpl <= 180) return "MISTAKE";
  return "BLUNDER";
}

function normalizeEvalForSide(evalCp: number, side: "w" | "b") {
  return side === "w" ? evalCp : -evalCp;
}

function uciFromVerboseMove(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export async function buildGameReview({
  pgn,
  baseElo = 3200,
}: {
  pgn: string;
  baseElo?: number;
}): Promise<ReviewSummary> {
  const source = new Chess();
  source.loadPgn(pgn);
  const moves = source.history({ verbose: true });

  const replay = new Chess();
  const reviewedMoves: MoveReview[] = [];

  const counts: Record<MoveClassification, number> = {
    BRILLIANT: 0,
    GREAT: 0,
    BEST: 0,
    EXCELLENT: 0,
    GOOD: 0,
    INACCURACY: 0,
    MISTAKE: 0,
    BLUNDER: 0,
  };

  let whitePenalty = 0;
  let blackPenalty = 0;

  for (let idx = 0; idx < moves.length; idx += 1) {
    const move = moves[idx];
    const side = replay.turn() as "w" | "b";
    const fenBefore = replay.fen();

    const best = await getEngineBestMove({
      fen: fenBefore,
      elo: baseElo,
      movetime: 250,
    });

    const legalMoves = replay.moves({ verbose: true });
    const playedLegal = legalMoves.find((candidate) => candidate.san === move.san);

    if (!playedLegal) {
      continue;
    }

    const playedUci = uciFromVerboseMove(playedLegal);

    replay.move(move.san);

    const playedEval = await getEngineBestMove({
      fen: replay.fen(),
      elo: baseElo,
      movetime: 200,
    });

    const evalBefore = normalizeEvalForSide(best.evaluation.cp, side);
    const evalAfterPlayed = -normalizeEvalForSide(playedEval.evaluation.cp, side === "w" ? "b" : "w");
    const cpl = Math.max(0, Math.round(evalBefore - evalAfterPlayed));

    const boardBefore = new Chess(fenBefore);
    const materialBefore = boardBefore.board().flat().filter(Boolean).length;
    const materialAfter = replay.board().flat().filter(Boolean).length;
    const sacrifice = materialAfter < materialBefore;

    let classification = classifyMove(cpl, sacrifice, playedUci === best.bestMove);

    if (classification === "EXCELLENT" && cpl <= 12 && playedUci !== best.bestMove) {
      classification = "GREAT";
    }

    counts[classification] += 1;

    if (side === "w") {
      whitePenalty += cpl;
    } else {
      blackPenalty += cpl;
    }

    reviewedMoves.push({
      moveNumber: Math.floor(idx / 2) + 1,
      color: side,
      san: move.san,
      playedMoveUci: playedUci,
      bestMoveUci: best.bestMove,
      centipawnLoss: cpl,
      evalBefore,
      evalAfterPlayed,
      classification,
    });
  }

  const whiteMoveCount = reviewedMoves.filter((entry) => entry.color === "w").length;
  const blackMoveCount = reviewedMoves.filter((entry) => entry.color === "b").length;

  return {
    moves: reviewedMoves,
    counts,
    accuracy: {
      white: whiteMoveCount ? Math.max(30, Math.round(100 - whitePenalty / whiteMoveCount / 3)) : 100,
      black: blackMoveCount ? Math.max(30, Math.round(100 - blackPenalty / blackMoveCount / 3)) : 100,
    },
  };
}
