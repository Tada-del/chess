import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-[#252320] p-6">
      <h1 className="text-2xl font-black text-white">Create account</h1>
      <p className="mt-1 text-sm text-slate-300">Use email/password and verify via Gmail link, or sign in with Google later.</p>
      <div className="mt-4">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Already a member? <Link href="/login" className="text-emerald-300">Log in</Link>
      </p>
    </div>
  );
}
