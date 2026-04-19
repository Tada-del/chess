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
let phase: "boot" | "run" = "boot";
let readyPromise: Promise<void> | null = null;
let resolveReady: (() => void) | null = null;
let rejectReady: ((reason?: unknown) => void) | null = null;

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
  phase = "boot";
  readyPromise = null;
  resolveReady = null;
  rejectReady = null;

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

  readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  engine = spawn(stockfishPath(), [], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (engine.stderr) {
    engine.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        console.error("[stockfish stderr]", text);
      }
    });
  }

  reader = createInterface({ input: engine.stdout });

  reader.on("line", (line) => {
    if (phase === "boot") {
      if (line === "uciok") {
        engine?.stdin.write("isready\n");
        return;
      }
      if (line === "readyok") {
        phase = "run";
        resolveReady?.();
        resolveReady = null;
        rejectReady = null;
      }
      return;
    }

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
    rejectReady?.(error);
    rejectReady = null;
    if (currentJob) {
      currentJob.reject(error);
      clearTimeout(currentJob.timer);
      currentJob = null;
    }
    teardownEngine();
  });

  engine.on("exit", () => {
    const err = new Error("Stockfish process exited unexpectedly.");
    rejectReady?.(err);
    rejectReady = null;
    if (currentJob) {
      currentJob.reject(err);
      clearTimeout(currentJob.timer);
      currentJob = null;
    }
    teardownEngine();
  });

  engine.stdin.write("uci\n");
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

    if (readyPromise) {
      await Promise.race([
        readyPromise,
        new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error("Stockfish UCI init timeout. Is STOCKFISH_BIN set correctly?")), 15_000),
        ),
      ]);
    }

    if (phase !== "run" || !engine) {
      throw new Error("Stockfish engine not ready.");
    }

    const proc = engine;
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

      proc.stdin.write("ucinewgame\n");
      proc.stdin.write("setoption name UCI_LimitStrength value true\n");
      proc.stdin.write(`setoption name UCI_Elo value ${normalizedElo}\n`);
      proc.stdin.write(`position fen ${fen}\n`);
      if (depth) {
        proc.stdin.write(`go depth ${depth}\n`);
      } else {
        proc.stdin.write(`go movetime ${movetime}\n`);
      }
    });
  });
}
