import { createServer } from "node:http";
import next from "next";
import { Chess } from "chess.js";
import { Server as SocketIOServer } from "socket.io";
import { TIME_CONTROL_PRESETS } from "./lib/constants";

type LiveRoomState = {
  roomCode: string;
  game: Chess;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  lastMoveAt: number;
  undoPendingFor: string | null;
};

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map<string, LiveRoomState>();

function createInitialRoom(roomCode: string, timeControl: string): LiveRoomState {
  const preset = TIME_CONTROL_PRESETS.find((entry) => entry.key === timeControl) ?? TIME_CONTROL_PRESETS[1];

  return {
    roomCode,
    game: new Chess(),
    whitePlayerId: null,
    blackPlayerId: null,
    whiteTimeMs: preset.initialSeconds * 1000,
    blackTimeMs: preset.initialSeconds * 1000,
    incrementMs: preset.incrementSeconds * 1000,
    lastMoveAt: Date.now(),
    undoPendingFor: null,
  };
}

function roomSnapshot(room: LiveRoomState) {
  return {
    fen: room.game.fen(),
    pgn: room.game.pgn(),
    whitePlayerId: room.whitePlayerId,
    blackPlayerId: room.blackPlayerId,
    turn: room.game.turn(),
    whiteTimeMs: room.whiteTimeMs,
    blackTimeMs: room.blackTimeMs,
    incrementMs: room.incrementMs,
    lastMoveAt: room.lastMoveAt,
    undoPendingFor: room.undoPendingFor,
  };
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const existing = rooms.get(roomCode) ?? createInitialRoom(roomCode, "blitz");
      rooms.set(roomCode, existing);

      if (!existing.whitePlayerId) {
        existing.whitePlayerId = userId;
      } else if (!existing.blackPlayerId && existing.whitePlayerId !== userId) {
        existing.blackPlayerId = userId;
      }

      socket.join(roomCode);
      io.to(roomCode).emit("room-state", roomSnapshot(existing));
      io.to(roomCode).emit("room-message", "Players connected.");
    });

    socket.on(
      "make-move",
      ({ roomCode, from, to, promotion, userId }: { roomCode: string; from: string; to: string; promotion?: string; userId: string }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const turn = room.game.turn();
        if (turn === "w" && room.whitePlayerId !== userId) return;
        if (turn === "b" && room.blackPlayerId !== userId) return;

        const now = Date.now();
        const elapsed = Math.max(0, now - room.lastMoveAt);

        if (turn === "w") {
          room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed + room.incrementMs);
        } else {
          room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed + room.incrementMs);
        }

        const move = room.game.move({ from, to, promotion: promotion ?? "q" });
        if (!move) {
          socket.emit("room-message", "Illegal move.");
          return;
        }

        room.lastMoveAt = now;
        room.undoPendingFor = null;

        io.to(roomCode).emit("room-state", roomSnapshot(room));

        if (room.game.isGameOver()) {
          io.to(roomCode).emit("room-message", "Game over.");
        }
      },
    );

    socket.on("undo-request", ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.whitePlayerId === userId && room.blackPlayerId) {
        room.undoPendingFor = room.blackPlayerId;
      } else if (room.blackPlayerId === userId && room.whitePlayerId) {
        room.undoPendingFor = room.whitePlayerId;
      }

      io.to(roomCode).emit("room-state", roomSnapshot(room));
      io.to(roomCode).emit("room-message", "Undo request sent.");
    });

    socket.on("undo-response", ({ roomCode, userId, accept }: { roomCode: string; userId: string; accept: boolean }) => {
      const room = rooms.get(roomCode);
      if (!room || room.undoPendingFor !== userId) return;

      if (accept) {
        room.game.undo();
        room.game.undo();
        io.to(roomCode).emit("room-message", "Undo accepted.");
      } else {
        io.to(roomCode).emit("room-message", "Undo declined.");
      }

      room.undoPendingFor = null;
      io.to(roomCode).emit("room-state", roomSnapshot(room));
    });
  });

  httpServer
    .once("error", (error) => {
      console.error(error);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
