import { redirect } from "next/navigation";
import { ChessArena } from "@/components/chess/chess-arena";
import { auth } from "@/lib/auth";

export default async function PlayPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Play vs AI</h1>
      <ChessArena userName={session.user.name ?? "Player"} userId={session.user.id} />
    </div>
  );
}
