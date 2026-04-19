import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  requestId: z.string(),
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const requestRow = await prisma.friendRequest.findUnique({ where: { id: parsed.data.requestId } });

  if (!requestRow || requestRow.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (requestRow.status !== "PENDING") {
    return NextResponse.json({ error: "Request already resolved." }, { status: 409 });
  }

  if (parsed.data.action === "DECLINE") {
    await prisma.friendRequest.update({
      where: { id: requestRow.id },
      data: { status: "DECLINED" },
    });

    return NextResponse.json({ success: true });
  }

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestRow.id },
      data: { status: "ACCEPTED" },
    }),
    prisma.friendship.create({
      data: {
        userId: requestRow.senderId,
        friendId: requestRow.receiverId,
      },
    }),
    prisma.friendship.create({
      data: {
        userId: requestRow.receiverId,
        friendId: requestRow.senderId,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
