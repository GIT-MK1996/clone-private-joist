import { getCompany } from "@/lib/data";
import { removePaymentKey, saveCompany, savePaymentKey } from "@/lib/actions";
import { VAT_RATES, eur } from "@/lib/calc";
import { billingDisabled, PLANS, type Plan } from "@/lib/billing";
import { cancelSubscription, openPortal, resumeSubscription } from "@/lib/billing-actions";
import Link from "next/link";

const PAY_MSG: Record<string, [string, string]> = {
  ok: ["Betalingen zijn gekoppeld ✓", "bg-emerald-50 text-emerald-800"],
  ongeldig: ["Dit is geen geldige sleutel. Een Stripe-sleutel begint met sk_test_ of sk_live_, een Mollie-sleutel met test_ of live_.", "bg-rose-50 text-rose-800"],
  publishable: ["Dit is de publieke sleutel (pk_…). Gebruik de geheime sleutel: die begint met sk_test_ of sk_live_.", "bg-rose-50 text-rose-800"],
  geweigerd: ["Deze sleutel wordt niet geaccepteerd. Controleer of je hem helemaal goed hebt gekopieerd.", "bg-rose-50 text-rose-800"],
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ opgeslagen?: string; betaal?: string; abo?: string }>;
}) {
  const c = await getCompany();
  const { opgeslagen, betaal, abo } = await searchParams;
  const until = c.subPeriodEnd ? new Date(c.subPeriodEnd).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
  const plan = PLANS[c.subPlan as Plan];
  const text: [keyof typeof c, string, string?][] = [
    ["name", "Bedrijfsnaam"],
    ["email", "E-mail (antwoorden van klanten komen hier)"],
    ["phone", "Telefoon"],
    ["address", "Adres"],
    ["postcode", "Postcode"],
    ["city", "Plaats"],
    ["kvk", "KvK-nummer", "8 cijfers"],
    ["btwId", "Btw-identificatienummer", "NL000000000B01"],
    ["iban", "IBAN", "NL00 BANK 0000 0000 00"],
  ];
  return (
    <div className="space-y-6">
      <form action={saveCompany} className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Instellingen</h1>
          {opgeslagen && <span className="text-sm text-emerald-700">Opgeslagen ✓</span>}
        </div>

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Bedrijfsgegevens</h2>
          <p className="text-sm text-muted">Deze gegevens staan op elke offerte en factuur. KvK, btw-nummer en IBAN zijn verplicht op een Nederlandse factuur.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {text.map(([key, label, ph]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={key}>{label}</label>
                <input id={key} name={key} defaultValue={String(c[key] ?? "")} placeholder={ph} />
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Btw en termijnen</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="defaultVat">Standaard btw-tarief</label>
              <select id="defaultVat" name="defaultVat" defaultValue={c.defaultVat}>
                {VAT_RATES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="paymentTermsDays">Betaaltermijn (dagen)</label>
              <input id="paymentTermsDays" name="paymentTermsDays" inputMode="numeric" defaultValue={c.paymentTermsDays} />
            </div>
            <div className="space-y-1">
              <label htmlFor="quoteValidDays">Offerte geldig (dagen)</label>
              <input id="quoteValidDays" name="quoteValidDays" inputMode="numeric" defaultValue={c.quoteValidDays} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-ink">
            <input type="checkbox" name="kor" defaultChecked={c.kor} />
            Ik gebruik de kleineondernemersregeling (KOR): geen btw op mijn facturen
          </label>
        </section>

        <button className="btn-primary">Opslaan</button>
      </form>

      <section id="betalingen" className="card space-y-3 p-4">
        <h2 className="font-semibold">Online betalen (iDEAL)</h2>
        <p className="text-sm text-muted">
          Koppel je eigen Stripe- of Mollie-account. Je klant betaalt dan met iDEAL of creditcard via de knop op de factuur, en het geld komt
          direct bij jou binnen. Klusnota rekent hier niets voor. Stripe of Mollie rekent een klein bedrag per betaling.
        </p>
        {betaal && PAY_MSG[betaal] && <p className={`rounded-lg p-3 text-sm ${PAY_MSG[betaal][1]}`}>{PAY_MSG[betaal][0]}</p>}
        {c.payKeyEnc ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">{c.payProvider === "stripe" ? "Stripe" : "Mollie"}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.payMode === "live" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {c.payMode === "live" ? "Live: echte betalingen" : "Testmodus: geen echt geld"}
            </span>
            <form action={removePaymentKey}>
              <button className="btn-secondary">Ontkoppelen</button>
            </form>
          </div>
        ) : null}
        <form action={savePaymentKey} className="flex flex-col gap-2 sm:flex-row">
          <input name="payKey" type="password" autoComplete="off" placeholder="sk_test_… (Stripe) of test_… (Mollie)" aria-label="Geheime API-sleutel" required />
          <button className="btn-primary whitespace-nowrap">{c.payKeyEnc ? "Sleutel vervangen" : "Koppelen"}</button>
        </form>
        <p className="text-xs text-muted">
          Stripe: Dashboard → Developers → API keys → <strong>Secret key</strong> (begint met sk_test_). Mollie: Developers → API-sleutels. Begin met
          een testsleutel om het uit te proberen. De sleutel wordt versleuteld opgeslagen.
        </p>
      </section>

      <section id="abonnement" className="card space-y-3 p-4">
        <h2 className="font-semibold">Abonnement</h2>
        {abo === "opgezegd" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Opgezegd. Je kunt Klusnota gebruiken tot {until}.</p>}
        {abo === "hervat" && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Je abonnement loopt gewoon door ✓</p>}
        {billingDisabled() ? (
          <p className="text-sm text-muted">Betalen staat uit op deze omgeving.</p>
        ) : (
          <>
            <p className="text-sm">
              {c.subStatus === "trialing" ? "Gratis proefperiode" : plan ? `Klusnota ${plan.label.toLowerCase()}` : "Klusnota"}
              {plan && <> · {eur(plan.cents)} excl. btw</>}
              <br />
              <span className="text-muted">
                {c.subCancelAtEnd
                  ? `Opgezegd: stopt op ${until}.`
                  : c.subStatus === "trialing"
                    ? `Eerste betaling op ${until}.`
                    : c.subStatus === "past_due"
                      ? "De laatste betaling is mislukt. Werk je betaalgegevens bij."
                      : `Volgende betaling op ${until}.`}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {c.subCancelAtEnd ? (
                <form action={resumeSubscription}><button className="btn-primary">Toch doorgaan</button></form>
              ) : (
                <form action={cancelSubscription}><button className="btn-secondary">Opzeggen</button></form>
              )}
              <form action={openPortal}><button className="btn-ghost">Betaalgegevens en facturen</button></form>
            </div>
          </>
        )}
        <p className="text-xs text-muted">
          Je gegevens blijven van jou, ook na opzeggen.{" "}
          <Link href="/api/export" className="font-semibold text-brand-text underline">Download al je documenten (CSV)</Link>
        </p>
      </section>
    </div>
  );
}
