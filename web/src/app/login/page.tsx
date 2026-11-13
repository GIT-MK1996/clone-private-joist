import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { confirmCode, requestLogin } from "@/lib/auth-actions";
import { Logo } from "@/components/Logo";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Inloggen – Klusnota" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Vul een geldig e-mailadres in.",
  teveel: "Te veel pogingen. Probeer het over een kwartier opnieuw.",
  mail: "De e-mail kon niet worden verstuurd. Probeer het later opnieuw.",
  verlopen: "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.",
  google: "Inloggen met Google lukte niet. Probeer het nog eens, of log in met je e-mail.",
  code: "Deze code klopt niet of is verlopen. Kijk nog eens in de mail, of vraag een nieuwe aan.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verstuurd?: string; fout?: string }> }) {
  if (await getUser()) redirect("/app");
  const { verstuurd, fout } = await searchParams;
  const devLink = process.env.NODE_ENV !== "production" ? (await cookies()).get("wb_devlink")?.value : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight">
        <Logo />
      </Link>
      {verstuurd ? (
        <div className="card space-y-3 p-6">
          <h1 className="text-xl font-bold">Check je mail</h1>
          <p className="text-muted">We hebben je een mail gestuurd met een code van 6 cijfers. Typ hem hieronder in, of klik op de knop in de mail.</p>
          {fout && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[fout] ?? "Er ging iets mis."}</p>}
          <form action={confirmCode} className="space-y-2">
            <label htmlFor="code">Inlogcode</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              autoFocus
              placeholder="123 456"
              className="text-center text-2xl tracking-[0.3em] tabular-nums"
            />
            <button className="btn-primary w-full py-3">Inloggen</button>
          </form>
          <p className="text-sm text-muted">Niks ontvangen? Kijk in je spam of <Link href="/login" className="underline">probeer opnieuw</Link>.</p>
          {devLink && (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm">
              <p className="font-semibold">Ontwikkelmodus (geen e-mail ingesteld)</p>
              <a href={devLink} className="break-all text-brand-text underline">Open inloglink</a>
            </div>
          )}
        </div>
      ) : (
        <form action={requestLogin} className="card space-y-4 p-6">
          <div>
            <h1 className="text-xl font-bold">Inloggen of account maken</h1>
            <p className="mt-1 text-sm text-muted">Geen wachtwoord nodig.</p>
          </div>
          {fout && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[fout] ?? "Er ging iets mis."}</p>}
          {googleEnabled() && (
            <>
              <a href="/api/auth/google/start" className="btn-secondary flex w-full items-center justify-center gap-2 py-3">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                </svg>
                Doorgaan met Google
              </a>
              <p className="text-center text-xs text-muted">of met je e-mailadres</p>
            </>
          )}
          <div className="space-y-1">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" name="email" type="email" required autoComplete="email" autoFocus placeholder="jij@bedrijf.nl" />
          </div>
          <button className="btn-primary w-full py-3">Stuur inlogcode</button>
        </form>
      )}
    </main>
  );
}
