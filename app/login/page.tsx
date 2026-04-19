import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-[#252320] p-6">
      <h1 className="text-2xl font-black text-white">Log in</h1>
      <p className="mt-1 text-sm text-slate-300">Access your account and continue your games.</p>
      <div className="mt-4">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Need an account? <Link href="/register" className="text-emerald-300">Sign up</Link>
      </p>
    </div>
  );
}
