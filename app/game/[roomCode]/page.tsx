import { redirect } from "next/navigation";
import { LiveMatchClient } from "@/components/chess/live-match-client";
import { auth } from "@/lib/auth";

export default async function GameRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { roomCode } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Live match room {roomCode}</h1>
      <LiveMatchClient roomCode={roomCode} userId={session.user.id} userName={session.user.name ?? "Player"} />
    </div>
  );
}
