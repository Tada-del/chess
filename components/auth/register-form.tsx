"use client";

import { FormEvent, useState } from "react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not create account.");
      return;
    }

    setMessage(payload.message ?? "Account created. Check your email for verification link.");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Display name"
        required
        className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2"
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Gmail or email"
        required
        className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password (min 8 chars)"
        required
        minLength={8}
        className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2"
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-md bg-[#81b64c] px-3 py-2 font-bold text-[#183014] disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
