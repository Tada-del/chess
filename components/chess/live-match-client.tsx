"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

type RoomState = {
  fen: string;
  pgn: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  turn: "w" | "b";
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  lastMoveAt: number;
  undoPendingFor: string | null;
};

export function LiveMatchClient({ roomCode, userId, userName }: { roomCode: string; userId: string; userName: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  const [message, setMessage] = useState("Connecting...");

  useEffect(() => {
    socket = io({ path: "/socket.io" });

    socket.on("connect", () => {
      socket?.emit("join-room", { roomCode, userId, userName });
    });

    socket.on("room-state", (nextState: RoomState) => {
      setState(nextState);
      setMessage("Connected");
    });

    socket.on("room-message", (text: string) => {
      setMessage(text);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [roomCode, userId, userName]);

  const myColor = useMemo(() => {
    if (!state) return "w";
    if (state.whitePlayerId === userId) return "w";
    if (state.blackPlayerId === userId) return "b";
    return "w";
  }, [state, userId]);

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;

    if (!state) return false;

    if (state.turn !== myColor) {
      setPremove({ from: sourceSquare, to: targetSquare });
      setMessage(`Premove queued: ${sourceSquare}-${targetSquare}`);
      return false;
    }

    socket?.emit("make-move", {
      roomCode,
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
      userId,
    });

    return true;
  };

  useEffect(() => {
    if (!state || !premove || state.turn !== myColor) return;

    socket?.emit("make-move", {
      roomCode,
      from: premove.from,
      to: premove.to,
      promotion: "q",
      userId,
    });

    const clearTimer = window.setTimeout(() => {
      setPremove(null);
    }, 0);

    return () => window.clearTimeout(clearTimer);
  }, [state, premove, myColor, roomCode, userId]);

  const sendUndo = () => {
    socket?.emit("undo-request", { roomCode, userId });
  };

  const respondUndo = (accept: boolean) => {
    socket?.emit("undo-response", { roomCode, userId, accept });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,1fr)_320px]">
      <section className="rounded-2xl border border-slate-700 bg-[#2f2d28] p-4">
        <Chessboard
          options={{
            id: "live-board",
            position: state?.fen ?? new Chess().fen(),
            boardOrientation: myColor === "b" ? "black" : "white",
            onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop({ sourceSquare, targetSquare }),
            darkSquareStyle: { backgroundColor: "#769656" },
            lightSquareStyle: { backgroundColor: "#eeeed2" },
            boardStyle: { borderRadius: "10px", maxWidth: "640px", margin: "0 auto" },
            animationDurationInMs: 200,
          }}
        />
      </section>

      <aside className="space-y-3 rounded-2xl border border-slate-700 bg-[#25231f] p-4 text-sm text-slate-200">
        <div className="rounded-md bg-slate-800/60 p-3">Room: {roomCode}</div>
        <div className="rounded-md bg-slate-800/60 p-3">Status: {message}</div>
        <div className="rounded-md bg-slate-800/60 p-3">You are playing as {myColor === "w" ? "White" : "Black"}</div>
        <div className="rounded-md bg-slate-800/60 p-3">
          Time: White {Math.ceil((state?.whiteTimeMs ?? 0) / 1000)}s / Black {Math.ceil((state?.blackTimeMs ?? 0) / 1000)}s
        </div>

        <button onClick={sendUndo} className="w-full rounded-md border border-slate-500 px-3 py-2 hover:bg-slate-800/50">
          Request undo
        </button>

        {state?.undoPendingFor === userId ? (
          <div className="space-y-2 rounded-md border border-amber-600 bg-amber-950/30 p-3">
            <p>Opponent requested an undo.</p>
            <div className="flex gap-2">
              <button onClick={() => respondUndo(true)} className="flex-1 rounded-md bg-green-700 px-3 py-2">
                Accept
              </button>
              <button onClick={() => respondUndo(false)} className="flex-1 rounded-md bg-rose-700 px-3 py-2">
                Decline
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
