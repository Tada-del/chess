import { Chess } from "chess.js";
import { ECO } from "chess-openings";

let ecoPromise: Promise<ECO> | null = null;

async function getEco() {
  if (!ecoPromise) {
    ecoPromise = (async () => {
      const eco = new ECO();
      await eco.open();
      return eco;
    })();
  }

  return ecoPromise;
}

export async function detectOpeningFromPgn(pgn: string): Promise<{ code?: string; name?: string }> {
  if (!pgn) {
    return {};
  }

  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history();

  const replay = new Chess();
  const eco = await getEco();

  let lastMatch: { code?: string; name?: string } = {};

  for (const sanMove of history) {
    replay.move(sanMove);
    const found = await eco.lookup(replay.fen());
    if (found) {
      lastMatch = {
        code: found.code,
        name: found.name,
      };
    }
  }

  return lastMatch;
}
