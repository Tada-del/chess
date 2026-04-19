import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [friendsA, friendsB, incoming, outgoing, users] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId: session.user.id },
      include: { friend: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { friendId: session.user.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { receiverId: session.user.id, status: "PENDING" },
      include: { sender: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: session.user.id, status: "PENDING" },
      include: { receiver: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        id: { not: session.user.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friendMap = new Map<string, { id: string; name: string | null; email: string; image: string | null }>();
  friendsA.forEach((entry: (typeof friendsA)[number]) => {
    friendMap.set(entry.friend.id, {
      id: entry.friend.id,
      name: entry.friend.name,
      email: entry.friend.email,
      image: entry.friend.image,
    });
  });
  friendsB.forEach((entry: (typeof friendsB)[number]) => {
    friendMap.set(entry.user.id, {
      id: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
      image: entry.user.image,
    });
  });

  return NextResponse.json({
    friends: [...friendMap.values()],
    incoming,
    outgoing,
    users,
  });
}
