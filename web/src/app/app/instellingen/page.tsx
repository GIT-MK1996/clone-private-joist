import { getCompany } from "@/lib/data";
import { saveCompany } from "@/lib/actions";
import { VAT_RATES } from "@/lib/calc";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const c = await getCompany();
  const { opgeslagen } = await searchParams;
  const text: [keyof typeof c, string, string?][] = [
    ["name", "Bedrijfsnaam"],
    ["email", "E-mail"],
    ["phone", "Telefoon"],
    ["address", "Adres"],
    ["postcode", "Postcode"],
    ["city", "Plaats"],
    ["kvk", "KvK-nummer", "8 cijfers"],
    ["btwId", "Btw-identificatienummer", "NL000000000B01"],
    ["iban", "IBAN", "NL00 BANK 0000 0000 00"],
  ];
  return (
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
  );
}
