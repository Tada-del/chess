import { isBefore } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/verify?status=error", request.url));
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier !== email.toLowerCase()) {
    return NextResponse.redirect(new URL("/verify?status=invalid", request.url));
  }

  if (isBefore(record.expires, new Date())) {
    return NextResponse.redirect(new URL("/verify?status=expired", request.url));
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(new URL("/verify?status=success", request.url));
}
