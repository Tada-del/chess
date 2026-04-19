import { addHours } from "date-fns";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = enforceRateLimit({
      key: `register-resend:${ip}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many resend attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "This account is already verified." }, { status: 409 });
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = randomUUID();
    const expires = addHours(new Date(), 24);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    await sendVerificationEmail({
      to: email,
      name: user.name,
      verificationUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox and spam folder.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to resend verification email right now." }, { status: 500 });
  }
}
