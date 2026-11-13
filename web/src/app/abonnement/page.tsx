import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompany } from "@/lib/data";
import { billingConfigured, hasAccess, PLANS, refreshIfStale, TRIAL_DAYS } from "@/lib/billing";
import { choosePlan } from "@/lib/billing-actions";
import { logout } from "@/lib/auth-actions";
import { Logo } from "@/components/Logo";
import { eur } from "@/lib/calc";

export const dynamic = "force-dynamic";

const perks = [
  "Onbeperkt offertes, facturen en klanten",
  "Klant zegt online akkoord en betaalt met iDEAL",
  "Versturen via WhatsApp of e-mail",
  "Hulp van een mens via WhatsApp",
  "Je prijs blijft gelijk zolang je klant bent",
];

export default async function Paywall({ searchParams }: { searchParams: Promise<{ fout?: string }> }) {
  const company = await refreshIfStale(await getCompany({ unpaid: true }));
  if (hasAccess(company)) redirect("/app");
  const { fout } = await searchParams;
  const ended = Boolean(company.subId);
  const firstCharge = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <nav className="mb-10 flex items-center justify-between">
        <Logo size={24} />
        <form action={logout}>
          <button className="btn-ghost px-2 py-1 text-sm">Uitloggen</button>
        </form>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight text-balance">
        {ended ? "Je abonnement is gestopt" : `Probeer Klusnota ${TRIAL_DAYS} dagen gratis`}
      </h1>
      <p className="mt-3 text-muted">
        {ended
          ? "Start opnieuw om verder te gaan. Je offertes, facturen en klanten staan er nog."
          : `Vandaag betaal je niets. Stop je binnen ${TRIAL_DAYS} dagen, dan betaal je ook niets.`}
      </p>

      <ul className="mt-6 space-y-2">
        {perks.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="font-bold text-brand-text" aria-hidden="true">✓</span>
            {p}
          </li>
        ))}
      </ul>

      {fout && (
        <p className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {billingConfigured() ? "Het afrekenen lukte niet. Probeer het nog eens." : "Betalen is nog niet ingesteld (BILLING_STRIPE_KEY ontbreekt)."}
        </p>
      )}

      <form action={choosePlan} className="mt-8 space-y-3">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Kies hoe je betaalt</legend>
          {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((k) => {
            const p = PLANS[k];
            return (
              <label
                key={k}
                className="card relative flex cursor-pointer flex-col gap-1 p-4 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand"
              >
                <input type="radio" name="plan" value={k} defaultChecked={k === "jaar"} className="sr-only" />
                {k === "jaar" && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-brand-ink">
                    2 maanden gratis
                  </span>
                )}
                <span className="text-sm font-semibold text-muted">{p.label}</span>
                <span className="text-2xl font-extrabold tabular-nums">
                  {eur(p.cents)}
                  <span className="text-sm font-medium text-muted"> /{k === "jaar" ? "jaar" : "maand"}</span>
                </span>
                <span className="text-xs text-muted">
                  excl. btw · {k === "jaar" ? `${eur(1000)} per maand` : p.note}
                </span>
              </label>
            );
          })}
        </fieldset>
        <button className="btn-primary w-full py-3 text-base">
          {ended ? "Opnieuw starten" : `Start ${TRIAL_DAYS} dagen gratis`}
        </button>
        {!ended && (
          <p className="text-center text-sm text-muted">
            Je eerste betaling is op {firstCharge}. Opzeggen kan met één klik in Instellingen.
          </p>
        )}
      </form>

      {ended && (
        <p className="mt-8 text-sm text-muted">
          Wil je niet verder? Je gegevens blijven van jou.{" "}
          <Link href="/api/export" className="font-semibold text-brand-text underline">Download al je documenten (CSV)</Link>
        </p>
      )}
    </main>
  );
}
