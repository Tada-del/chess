import { Chess } from "chess.js";
import { AI_PERSONALITIES, AIPersonalityKey } from "@/lib/constants";
import { getEngineBestMove } from "@/lib/stockfish-service";

function clampElo(elo: number) {
  return Math.max(100, Math.min(3200, Math.round(elo / 100) * 100));
}

function getPersonaElo(baseElo: number, personality: AIPersonalityKey): number {
  const profile = AI_PERSONALITIES.find((item) => item.key === personality);
  if (!profile) return clampElo(baseElo);
  return clampElo(baseElo + profile.eloShift);
}

export async function generateBotMove({
  fen,
  elo,
  personality,
}: {
  fen: string;
  elo: number;
  personality: AIPersonalityKey;
}) {
  const requestedElo = getPersonaElo(elo, personality);

  const searchDepth = requestedElo > 2600 ? 18 : requestedElo > 2000 ? 14 : requestedElo > 1400 ? 10 : 8;
  const movetime = requestedElo > 2800 ? 600 : requestedElo > 2200 ? 400 : requestedElo > 1400 ? 280 : 180;

  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });

  if (legal.length === 0) {
    throw new Error("No legal moves in position.");
  }

  let best: { bestMove: string; evaluation: { cp: number; mate?: number; bestMove?: string } };
  try {
    best = await getEngineBestMove({
      fen,
      elo: requestedElo,
      depth: searchDepth,
      movetime,
    });
  } catch {
    const fallback = legal[Math.floor(Math.random() * legal.length)];
    return {
      move: `${fallback.from}${fallback.to}${fallback.promotion ?? ""}`,
      evaluation: { cp: 0 },
      effectiveElo: requestedElo,
    };
  }

  if (personality === "gemini" || personality === "chatgpt") {
    const tacticalCandidate = legal.find((move) => move.flags.includes("c") || move.flags.includes("e"));
    if (tacticalCandidate && Math.random() < 0.2) {
      return {
        move: `${tacticalCandidate.from}${tacticalCandidate.to}${tacticalCandidate.promotion ?? ""}`,
        evaluation: best.evaluation,
        effectiveElo: requestedElo,
      };
    }
  }

  if (personality === "copilot" && Math.random() < 0.18) {
    const safeMove = legal.find((move) => !move.flags.includes("c"));
    if (safeMove) {
      return {
        move: `${safeMove.from}${safeMove.to}${safeMove.promotion ?? ""}`,
        evaluation: best.evaluation,
        effectiveElo: requestedElo,
      };
    }
  }

  return {
    move: best.bestMove,
    evaluation: best.evaluation,
    effectiveElo: requestedElo,
  };
}
