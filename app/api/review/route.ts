import { NextResponse } from "next/server";
import { z } from "zod";
import { buildGameReview } from "@/lib/review";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  pgn: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = enforceRateLimit({
      key: `review:${ip}`,
      limit: 25,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many review requests. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
    }

    const review = await buildGameReview({ pgn: parsed.data.pgn });
    return NextResponse.json(review);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to review game." }, { status: 500 });
  }
}
