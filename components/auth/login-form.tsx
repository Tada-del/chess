"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("EMAIL_NOT_VERIFIED")) {
        setError("Verify your email first via the Gmail link.");
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    window.location.href = "/";
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        required
        className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2"
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-md bg-[#81b64c] px-3 py-2 font-bold text-[#183014] disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {googleEnabled ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full rounded-md border border-slate-400 px-3 py-2 text-sm"
        >
          Continue with Google
        </button>
      ) : (
        <p className="text-xs text-slate-400">
          Google sign-in is currently unavailable. Configure GOOGLE_CLIENT_ID and
          GOOGLE_CLIENT_SECRET to enable it.
        </p>
      )}
    </form>
  );
}
