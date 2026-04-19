import Link from "next/link";

const statusCopy: Record<string, { title: string; text: string }> = {
  success: {
    title: "Email verified",
    text: "Your account is now active. You can log in and start playing.",
  },
  expired: {
    title: "Link expired",
    text: "This verification link expired. Please create your account again to get a fresh email.",
  },
  invalid: {
    title: "Invalid link",
    text: "This verification link is invalid.",
  },
  error: {
    title: "Verification error",
    text: "We could not verify your email due to a request issue.",
  },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawStatus = params.status;
  const status = typeof rawStatus === "string" ? rawStatus : "";
  const current = statusCopy[status] ?? {
    title: "Check your inbox",
    text: "We sent a confirmation link to your email address.",
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-700 bg-[#252320] p-6">
      <h1 className="text-2xl font-black text-white">{current.title}</h1>
      <p className="mt-2 text-sm text-slate-300">{current.text}</p>
      <Link href="/login" className="mt-4 inline-block rounded-md bg-[#81b64c] px-4 py-2 font-bold text-[#1a2f14]">
        Go to login
      </Link>
    </div>
  );
}
