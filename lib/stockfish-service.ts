import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface, Interface } from "node:readline";

export type EngineEval = {
  cp: number;
  mate?: number;
  bestMove?: string;
};

type PendingJob = {
  resolve: (value: { bestMove: string; evaluation: EngineEval }) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
  latestEval: EngineEval;
};

let engine: ChildProcessWithoutNullStreams | null = null;
let reader: Interface | null = null;
let queue = Promise.resolve();
let currentJob: PendingJob | null = null;

function normalizeElo(elo: number): number {
  if (Number.isNaN(elo)) return 1200;
  return Math.max(100, Math.min(3200, Math.round(elo / 100) * 100));
}

function stockfishPath() {
  return process.env.STOCKFISH_BIN || "/usr/games/stockfish";
}

function parseEval(line: string): { cp?: number; mate?: number } {
  const cpMatch = line.match(/score cp (-?\d+)/);
  if (cpMatch) {
    return { cp: Number(cpMatch[1]) };
  }

  const mateMatch = line.match(/score mate (-?\d+)/);
  if (mateMatch) {
    const mate = Number(mateMatch[1]);
    return { mate, cp: mate > 0 ? 10000 : -10000 };
  }

  return {};
}

function teardownEngine() {
  if (reader) {
    reader.close();
    reader = null;
  }

  if (engine) {
    try {
      engine.kill();
    } catch {
      // ignore
    }
    engine = null;
  }
}

function ensureEngine() {
  if (engine && !engine.killed) {
    return;
  }

  engine = spawn(stockfishPath(), [], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  reader = createInterface({ input: engine.stdout });

  reader.on("line", (line) => {
    if (!currentJob) {
      return;
    }

    if (line.startsWith("info")) {
      const score = parseEval(line);
      if (score.cp !== undefined) {
        currentJob.latestEval = {
          ...currentJob.latestEval,
          cp: score.cp,
          mate: score.mate,
        };
      }
      return;
    }

    if (line.startsWith("bestmove")) {
      const job = currentJob;
      currentJob = null;
      clearTimeout(job.timer);
      const bestMove = line.split(" ")[1];

      if (!bestMove || bestMove === "(none)") {
        job.reject(new Error("Stockfish did not return a legal move."));
        return;
      }

      job.resolve({
        bestMove,
        evaluation: {
          ...job.latestEval,
          bestMove,
        },
      });
    }
  });

  engine.on("error", (error) => {
    if (currentJob) {
      currentJob.reject(error);
      clearTimeout(currentJob.timer);
      currentJob = null;
    }
    teardownEngine();
  });

  engine.on("exit", () => {
    if (currentJob) {
      currentJob.reject(new Error("Stockfish process exited unexpectedly."));
      clearTimeout(currentJob.timer);
      currentJob = null;
    }
    teardownEngine();
  });

  engine.stdin.write("uci\n");
  engine.stdin.write("isready\n");
}

async function withQueue<T>(job: () => Promise<T>): Promise<T> {
  const previous = queue;
  let release: () => void = () => undefined;
  queue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await job();
  } finally {
    release();
  }
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
  return withQueue(async () => {
    ensureEngine();

    if (!engine) {
      throw new Error("Stockfish engine not available.");
    }

    const normalizedElo = normalizeElo(elo);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const active = currentJob;
        currentJob = null;
        active?.reject(new Error("Stockfish response timeout."));
      }, 10_000);

      currentJob = {
        resolve,
        reject,
        timer,
        latestEval: { cp: 0 },
      };

      engine?.stdin.write("ucinewgame\n");
      engine?.stdin.write("setoption name UCI_LimitStrength value true\n");
      engine?.stdin.write(`setoption name UCI_Elo value ${normalizedElo}\n`);
      engine?.stdin.write(`position fen ${fen}\n`);
      if (depth) {
        engine?.stdin.write(`go depth ${depth}\n`);
      } else {
        engine?.stdin.write(`go movetime ${movetime}\n`);
      }
    });
  });
}
