import { Chess } from "chess.js";

export type EngineEval = {
  cp: number;
  mate?: number;
  bestMove?: string;
};

function normalizeElo(elo: number): number {
  if (Number.isNaN(elo)) return 1200;
  return Math.max(100, Math.min(3200, Math.round(elo / 100) * 100));
}

export async function getEngineBestMove({
  fen,
  movetime = 250,
  depth,
  elo,
}: {
  fen: string;
  movetime?: number;
  depth?: number;
  elo: number;
}): Promise<{ bestMove: string; evaluation: EngineEval }> {
  const normalizedElo = normalizeElo(elo);
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  if (!legalMoves.length) {
    throw new Error("No legal moves available.");
  }

  const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);
  const strengthFactor = normalizedElo / 3200;
  const depthFactor = depth ? Math.min(1, depth / 20) : 0.5;
  const speedFactor = Math.min(1, movetime / 1000);
  const candidateCount = Math.max(1, Math.round((1 - (strengthFactor + depthFactor + speedFactor) / 3) * 12));
  const picked =
    shuffled[Math.min(candidateCount - 1, shuffled.length - 1)] ?? shuffled[0];

  const bestMove = `${picked.from}${picked.to}${picked.promotion ?? ""}`;
  const cp = Math.round((strengthFactor * 2 - 1) * 220 + (Math.random() * 40 - 20));

  return {
    bestMove,
    evaluation: {
      cp,
      bestMove,
    },
  };
}
