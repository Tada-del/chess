import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  receiverId: z.string(),
  timeControl: z.enum(["bullet", "blitz", "rapid", "classical"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      sender: true,
      receiver: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });

  return NextResponse.json({ challenges });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid challenge payload." }, { status: 400 });
  }

  const roomCode = randomUUID().slice(0, 8);

  const challenge = await prisma.challenge.create({
    data: {
      senderId: session.user.id,
      receiverId: parsed.data.receiverId,
      roomCode,
      timeControl: parsed.data.timeControl,
    },
  });

  return NextResponse.json({ challenge });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = z
    .object({
      challengeId: z.string(),
      accept: z.boolean(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid response payload." }, { status: 400 });
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: parsed.data.challengeId } });

  if (!challenge || challenge.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  if (!parsed.data.accept) {
    await prisma.challenge.delete({ where: { id: challenge.id } });
    return NextResponse.json({ accepted: false });
  }

  const updated = await prisma.challenge.update({
    where: { id: challenge.id },
    data: { accepted: true },
  });

  return NextResponse.json({ accepted: true, challenge: updated });
}
