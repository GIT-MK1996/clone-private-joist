import { getCompany } from "@/lib/data";
import { removeMollieKey, saveCompany, saveMollieKey } from "@/lib/actions";
import { VAT_RATES } from "@/lib/calc";

const MOLLIE_MSG: Record<string, [string, string]> = {
  ok: ["Mollie is gekoppeld ✓", "bg-emerald-50 text-emerald-800"],
  ongeldig: ["Dat is geen geldige Mollie API-sleutel. Hij begint met test_ of live_.", "bg-rose-50 text-rose-800"],
  geweigerd: ["Mollie accepteert deze sleutel niet. Controleer of je hem goed hebt gekopieerd.", "bg-rose-50 text-rose-800"],
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ opgeslagen?: string; mollie?: string }>;
}) {
  const c = await getCompany();
  const { opgeslagen, mollie } = await searchParams;
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
          Koppel je eigen Mollie-account. Je klant betaalt dan met iDEAL, Bancontact of creditcard via de knop op de factuur, en het geld komt
          direct bij jou binnen. Werkbon rekent hier niets voor. Mollie rekent per betaling (iDEAL ongeveer € 0,29).
        </p>
        {mollie && MOLLIE_MSG[mollie] && <p className={`rounded-lg p-3 text-sm ${MOLLIE_MSG[mollie][1]}`}>{MOLLIE_MSG[mollie][0]}</p>}
        {c.mollieKeyEnc ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.mollieMode === "live" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {c.mollieMode === "live" ? "Live: echte betalingen" : "Testmodus: geen echt geld"}
            </span>
            <form action={removeMollieKey}>
              <button className="btn-secondary">Ontkoppelen</button>
            </form>
          </div>
        ) : null}
        <form action={saveMollieKey} className="flex flex-col gap-2 sm:flex-row">
          <input name="mollieKey" type="password" autoComplete="off" placeholder="live_… of test_…" aria-label="Mollie API-sleutel" required />
          <button className="btn-primary whitespace-nowrap">{c.mollieKeyEnc ? "Sleutel vervangen" : "Koppelen"}</button>
        </form>
        <p className="text-xs text-muted">
          Je vindt de sleutel in het Mollie-dashboard onder Developers → API-sleutels. Begin met de test-sleutel om het uit te proberen. De sleutel wordt versleuteld opgeslagen.
        </p>
      </section>
    </div>
  );
}
