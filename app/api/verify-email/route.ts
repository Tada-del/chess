import { isBefore } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function verifyRedirect(path: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}${path}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(verifyRedirect("/verify?status=error"));
    }

    const normalizedEmail = email.toLowerCase();

    const alreadyVerified = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (alreadyVerified) {
      return NextResponse.redirect(verifyRedirect("/verify?status=success"));
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.identifier !== normalizedEmail) {
      return NextResponse.redirect(verifyRedirect("/verify?status=invalid"));
    }

    if (isBefore(record.expires, new Date())) {
      return NextResponse.redirect(verifyRedirect("/verify?status=expired"));
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email: normalizedEmail } });
    if (!pending || isBefore(pending.expiresAt, new Date())) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
      return NextResponse.redirect(verifyRedirect("/verify?status=expired"));
    }

    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: normalizedEmail,
          name: pending.name,
          passwordHash: pending.passwordHash,
          emailVerified: new Date(),
        },
      }),
      prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(verifyRedirect("/verify?status=success"));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(verifyRedirect("/verify?status=error"));
  }
}
