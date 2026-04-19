import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  const recentGames = session?.user?.id
    ? await prisma.game.findMany({
        where: {
          OR: [{ whiteId: session.user.id }, { blackId: session.user.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-700 bg-[#262421]/90 p-8 shadow-2xl">
        <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300/70">RoyalSquare Arena</p>
            <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Play chess with stunning UI, bots, and friends</h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              Challenge Stockfish from 100 Elo to max strength, play AI personalities, review every move with chess.com-style classifications, and compete with friends in bullet/blitz/rapid/classical matches.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/play" className="rounded-lg bg-[#81b64c] px-5 py-3 font-bold text-[#1b2d17] hover:bg-[#9ad25b]">
                Play now
              </Link>
              <Link href="/friends" className="rounded-lg border border-slate-500 px-5 py-3 font-semibold hover:border-slate-300 hover:text-white">
                Friends & matches
              </Link>
              <Link href="/analysis" className="rounded-lg border border-slate-500 px-5 py-3 font-semibold hover:border-slate-300 hover:text-white">
                Analysis center
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-[#2f2d2a] to-[#1d1b19] p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#1f1d1a] p-3">
                <p className="text-slate-400">AI Opponents</p>
                <p className="text-2xl font-bold text-white">6 + Stockfish</p>
              </div>
              <div className="rounded-xl bg-[#1f1d1a] p-3">
                <p className="text-slate-400">Stockfish Range</p>
                <p className="text-2xl font-bold text-white">100-3200</p>
              </div>
              <div className="rounded-xl bg-[#1f1d1a] p-3">
                <p className="text-slate-400">Review Labels</p>
                <p className="text-lg font-bold text-white">Best to Blunder</p>
              </div>
              <div className="rounded-xl bg-[#1f1d1a] p-3">
                <p className="text-slate-400">Live Modes</p>
                <p className="text-lg font-bold text-white">Bullet-Classical</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {session?.user ? (
        <section className="rounded-2xl border border-slate-700 bg-[#24221f] p-5">
          <h2 className="text-xl font-bold text-white">Recent games</h2>
          {recentGames.length ? (
            <ul className="mt-4 grid gap-2 text-sm text-slate-200">
              {recentGames.map((game: (typeof recentGames)[number]) => (
                <li key={game.id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                  {game.whiteName} vs {game.blackName} - {game.result.replaceAll("_", " ")} - {game.openingName ?? "Opening unknown"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No saved games yet. Start playing to populate your archive.</p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-700 bg-[#24221f] p-5 text-sm text-slate-300">
          Create an account or sign in with Google to save games, add friends, and enter live matches.
        </section>
      )}
    </div>
  );
}
