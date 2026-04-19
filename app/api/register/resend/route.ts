import { addHours, isBefore } from "date-fns";
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
    if (user?.emailVerified) {
      return NextResponse.json({ error: "This account is already verified." }, { status: 409 });
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      return NextResponse.json(
        { error: "No pending registration found for that email. Register again first." },
        { status: 404 },
      );
    }

    if (isBefore(pending.expiresAt, new Date())) {
      return NextResponse.json(
        { error: "Pending registration has expired. Please register again." },
        { status: 410 },
      );
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = randomUUID();
    const expires = addHours(new Date(), 24);

    await prisma.$transaction([
      prisma.pendingRegistration.update({
        where: { email },
        data: {
          expiresAt: expires,
        },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      }),
    ]);

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    await sendVerificationEmail({
      to: email,
      name: pending.name,
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
