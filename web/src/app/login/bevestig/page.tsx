import type { Metadata } from "next";
import Link from "next/link";
import { confirmLogin } from "@/lib/auth-actions";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Inloggen – Klusnota", robots: { index: false } };

// A button instead of logging in on GET: mail scanners open links and would burn the token.
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight">
        <Logo />
      </Link>
      <form action={confirmLogin} className="card space-y-4 p-6">
        <h1 className="text-xl font-bold">Bijna binnen</h1>
        <p className="text-muted">Klik op de knop om in te loggen op dit apparaat.</p>
        <input type="hidden" name="token" value={token ?? ""} />
        <button className="btn-primary w-full py-3" disabled={!token}>Inloggen</button>
      </form>
    </main>
  );
}
