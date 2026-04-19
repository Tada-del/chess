import { addHours, isBefore } from "date-fns";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = enforceRateLimit({
      key: `register:${ip}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup payload." }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = randomUUID();
    const expires = addHours(new Date(), 24);

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verificationUrl = `${baseUrl}/api/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendVerificationEmail({
      to: normalizedEmail,
      name,
      verificationUrl,
    });

    return NextResponse.json({
      success: true,
      message:
        "Account created. Please check your Gmail inbox for a verification link before signing in.",
      userId: user.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = enforceRateLimit({
      key: `verify:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Please wait a minute." }, { status: 429 });
    }

    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email." }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.identifier !== email.toLowerCase()) {
      return NextResponse.json({ error: "Verification link is invalid." }, { status: 400 });
    }

    if (isBefore(record.expires, new Date())) {
      return NextResponse.json({ error: "Verification link has expired." }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to verify email." }, { status: 500 });
  }
}
