import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { requestLogin } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Inloggen – Werkbon" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Vul een geldig e-mailadres in.",
  teveel: "Te veel pogingen. Probeer het over een kwartier opnieuw.",
  mail: "De e-mail kon niet worden verstuurd. Probeer het later opnieuw.",
  verlopen: "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verstuurd?: string; fout?: string }> }) {
  if (await getUser()) redirect("/app");
  const { verstuurd, fout } = await searchParams;
  const devLink = process.env.NODE_ENV !== "production" ? (await cookies()).get("wb_devlink")?.value : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight">
        <span className="text-brand">■</span> Werkbon
      </Link>
      {verstuurd ? (
        <div className="card space-y-3 p-6">
          <h1 className="text-xl font-bold">Check je mail</h1>
          <p className="text-muted">We hebben je een inloglink gestuurd. Klik op de knop in de mail om in te loggen. De link is 20 minuten geldig.</p>
          <p className="text-sm text-muted">Niks ontvangen? Kijk in je spam of <Link href="/login" className="underline">probeer opnieuw</Link>.</p>
          {devLink && (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm">
              <p className="font-semibold">Ontwikkelmodus (geen e-mail ingesteld)</p>
              <a href={devLink} className="break-all text-brand underline">Open inloglink</a>
            </div>
          )}
        </div>
      ) : (
        <form action={requestLogin} className="card space-y-4 p-6">
          <div>
            <h1 className="text-xl font-bold">Inloggen of account maken</h1>
            <p className="mt-1 text-sm text-muted">Geen wachtwoord nodig. Je krijgt een inloglink per mail.</p>
          </div>
          {fout && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[fout] ?? "Er ging iets mis."}</p>}
          <div className="space-y-1">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" name="email" type="email" required autoComplete="email" autoFocus placeholder="jij@bedrijf.nl" />
          </div>
          <button className="btn-primary w-full py-3">Stuur inloglink</button>
        </form>
      )}
    </main>
  );
}
