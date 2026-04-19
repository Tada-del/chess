import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function renderReviewCounts(review: unknown) {
  if (!review || typeof review !== "object") return null;
  const counts = (review as { counts?: Record<string, number> }).counts;
  if (!counts) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-300 sm:grid-cols-4">
      {Object.entries(counts).map(([key, value]) => (
        <span key={key} className="rounded-md border border-slate-600 px-2 py-1">
          {key}: {value}
        </span>
      ))}
    </div>
  );
}

export default async function AnalysisPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const games = await prisma.game.findMany({
    where: {
      OR: [{ whiteId: session.user.id }, { blackId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Analysis center</h1>
      <p className="text-sm text-slate-300">
        Review your games with move classifications inspired by chess.com game review (best/excellent/good/inaccuracy/mistake/blunder/brilliant/great).
      </p>
      <div className="space-y-3">
        {games.map((game: (typeof games)[number]) => (
          <article key={game.id} className="rounded-xl border border-slate-700 bg-[#272522] p-4">
            <h3 className="font-semibold text-white">
              {game.whiteName} vs {game.blackName}
            </h3>
            <p className="text-sm text-slate-300">
              {game.timeControl} - {game.result.replaceAll("_", " ")} - {game.openingEco ? `${game.openingEco} ${game.openingName}` : "Opening unknown"}
            </p>
            {renderReviewCounts(game.review)}
          </article>
        ))}
        {!games.length ? <p className="text-sm text-slate-400">No games found yet.</p> : null}
      </div>
    </div>
  );
}
