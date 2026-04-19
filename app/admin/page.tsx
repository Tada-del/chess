import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true,
      sentFriendRequests: true,
      receivedFriendRequests: true,
      whiteGames: true,
      blackGames: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Admin dashboard</h1>
      <p className="text-sm text-slate-300">Account registry, auth providers, social graph activity, and game volume overview.</p>
      <div className="grid gap-3">
        {users.map((user) => (
          <article key={user.id} className="rounded-xl border border-slate-700 bg-[#272522] p-4 text-sm text-slate-200">
            <h3 className="font-semibold text-white">{user.name ?? "(no name)"}</h3>
            <p>{user.email}</p>
            <p>Role: {user.role}</p>
            <p>Verified: {user.emailVerified ? "Yes" : "No"}</p>
            <p>Providers: {user.accounts.map((account) => account.provider).join(", ") || "Credentials"}</p>
            <p>Sessions: {user.sessions.length}</p>
            <p>Friends sent/received: {user.sentFriendRequests.length}/{user.receivedFriendRequests.length}</p>
            <p>Games played: {user.whiteGames.length + user.blackGames.length}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
