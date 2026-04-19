import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function NavShell() {
  const session = await auth();

  return (
    <header className="border-b border-slate-700/60 bg-[#262521]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-5 text-sm font-semibold text-slate-200">
          <Link href="/" className="text-lg font-bold text-white">
            RoyalSquare
          </Link>
          <Link href="/play" className="hover:text-white">
            Play
          </Link>
          <Link href="/friends" className="hover:text-white">
            Friends
          </Link>
          <Link href="/analysis" className="hover:text-white">
            Analysis
          </Link>
          {session?.user.role === "ADMIN" ? (
            <Link href="/admin" className="hover:text-white">
              Admin
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          {session?.user ? (
            <>
              <span className="hidden sm:block">{session.user.name ?? session.user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md border border-slate-500 px-3 py-1.5 hover:border-slate-300 hover:text-white">
                Log in
              </Link>
              <Link href="/register" className="rounded-md bg-[#81b64c] px-3 py-1.5 font-semibold text-[#142411] hover:bg-[#98c95f]">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
