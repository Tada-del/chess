import { isBefore } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(new URL("/verify?status=error", request.url));
    }

    const normalizedEmail = email.toLowerCase();

    const alreadyVerified = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (alreadyVerified) {
      return NextResponse.redirect(new URL("/verify?status=success", request.url));
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.identifier !== normalizedEmail) {
      return NextResponse.redirect(new URL("/verify?status=invalid", request.url));
    }

    if (isBefore(record.expires, new Date())) {
      return NextResponse.redirect(new URL("/verify?status=expired", request.url));
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email: normalizedEmail } });
    if (!pending || isBefore(pending.expiresAt, new Date())) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
      return NextResponse.redirect(new URL("/verify?status=expired", request.url));
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

    return NextResponse.redirect(new URL("/verify?status=success", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/verify?status=error", request.url));
  }
}
