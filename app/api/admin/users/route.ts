import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ users });
}
