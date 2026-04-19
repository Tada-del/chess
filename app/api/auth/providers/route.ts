import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const providers = authOptions.providers ?? [];
  const hasGoogle = providers.some((provider) => provider.id === "google");

  return NextResponse.json({
    hasGoogle,
  });
}
