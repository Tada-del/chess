import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  receiverId: z.string().min(5),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid receiver id." }, { status: 400 });
  }

  const receiverId = parsed.data.receiverId;

  if (receiverId === session.user.id) {
    return NextResponse.json({ error: "Cannot add yourself." }, { status: 400 });
  }

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: session.user.id, receiverId },
        { senderId: receiverId, receiverId: session.user.id },
      ],
      status: "PENDING",
    },
  });

  if (existing) {
    return NextResponse.json({ error: "A pending request already exists." }, { status: 409 });
  }

  const alreadyFriends = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: session.user.id, friendId: receiverId },
        { userId: receiverId, friendId: session.user.id },
      ],
    },
  });

  if (alreadyFriends) {
    return NextResponse.json({ error: "You are already friends." }, { status: 409 });
  }

  const requestRow = await prisma.friendRequest.create({
    data: {
      senderId: session.user.id,
      receiverId,
    },
  });

  return NextResponse.json({ request: requestRow });
}
