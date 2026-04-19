import { GameMode, GameResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveGameSchema = z.object({
  mode: z.nativeEnum(GameMode),
  timeControl: z.string(),
  whiteId: z.string().nullable().optional(),
  blackId: z.string().nullable().optional(),
  whiteName: z.string(),
  blackName: z.string(),
  pgn: z.string(),
  result: z.nativeEnum(GameResult),
  openingEco: z.string().nullable().optional(),
  openingName: z.string().nullable().optional(),
  moves: z.any().optional(),
  review: z.any().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    where: {
      OR: [{ whiteId: session.user.id }, { blackId: session.user.id }],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = saveGameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const game = await prisma.game.create({
      data: {
        ...parsed.data,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ game });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save game." }, { status: 500 });
  }
}
