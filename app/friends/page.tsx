import { redirect } from "next/navigation";
import { FriendsDashboard } from "@/components/friends-dashboard";
import { auth } from "@/lib/auth";

export default async function FriendsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Friends & online matches</h1>
      <FriendsDashboard currentUserId={session.user.id} />
    </div>
  );
}
