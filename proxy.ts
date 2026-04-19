import { NextResponse } from "next/server";

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/play", "/friends", "/analysis", "/admin", "/game/:path*"],
};
