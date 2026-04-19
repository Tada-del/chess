import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBotMove } from "@/lib/ai";
import { AI_PERSONALITIES } from "@/lib/constants";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  fen: z.string().min(10),
  elo: z.number().min(100).max(3200),
  personality: z.string(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = enforceRateLimit({
      key: `bot-move:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many bot requests. Slow down a bit." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bot move payload." }, { status: 400 });
    }

    const personalityValid = AI_PERSONALITIES.some((item) => item.key === parsed.data.personality);
    if (!personalityValid) {
      return NextResponse.json({ error: "Unknown AI personality." }, { status: 400 });
    }

    const result = await generateBotMove({
      fen: parsed.data.fen,
      elo: parsed.data.elo,
      personality: parsed.data.personality as (typeof AI_PERSONALITIES)[number]["key"],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate move." }, { status: 500 });
  }
}
