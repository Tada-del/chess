import { NextResponse } from "next/server";
import { z } from "zod";
import { detectOpeningFromPgn } from "@/lib/openings";

const schema = z.object({
  pgn: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid opening request payload." }, { status: 400 });
    }

    const opening = await detectOpeningFromPgn(parsed.data.pgn);
    return NextResponse.json(opening);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to identify opening." }, { status: 500 });
  }
}
