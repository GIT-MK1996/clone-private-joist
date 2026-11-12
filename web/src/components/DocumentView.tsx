import type { Client, Company, Doc, LineItem } from "@/db/schema";
import { computeTotals, eur, formatDate, lineTotal } from "@/lib/calc";

/** The document as the client sees it. Used on the public pages and the print/PDF page. */
export default function DocumentView({
  doc,
  lines,
  client,
  company,
}: {
  doc: Doc;
  lines: LineItem[];
  client: Client | null;
  company: Company;
}) {
  const t = computeTotals(lines, doc.discountCents, company.kor);
  const isQuote = doc.kind === "quote";
  const hasReverse = t.vatLines.some((v) => v.rate === "verlegd");

  return (
    <article className="card mx-auto max-w-3xl bg-white p-6 text-[14px] leading-relaxed sm:p-10 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xl font-bold">{company.name}</p>
          <p className="text-muted">
            {company.address}
            <br />
            {company.postcode} {company.city}
            <br />
            {[company.phone, company.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-brand">{isQuote ? "Offerte" : "Factuur"}</p>
          <p className="font-semibold">{doc.number}</p>
        </div>
      </header>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{isQuote ? "Voor" : "Factuur aan"}</p>
          {client ? (
            <p>
              <span className="font-semibold">{client.name}</span>
              {client.contactName && (
                <>
                  <br />t.a.v. {client.contactName}
                </>
              )}
              <br />
              {client.address}
              <br />
              {client.postcode} {client.city}
              {client.btwId && (
                <>
                  <br />
                  Btw-nr: {client.btwId}
                </>
              )}
            </p>
          ) : (
            <p className="text-muted">—</p>
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 sm:justify-self-end">
          <dt className="text-muted">{isQuote ? "Offertedatum" : "Factuurdatum"}</dt>
          <dd>{formatDate(doc.issueDate)}</dd>
          {isQuote ? (
            <>
              <dt className="text-muted">Geldig tot</dt>
              <dd>{formatDate(doc.validUntil)}</dd>
            </>
          ) : (
            <>
              <dt className="text-muted">Vervaldatum</dt>
              <dd>{formatDate(doc.dueDate)}</dd>
            </>
          )}
        </dl>
      </section>

      {doc.title && <p className="mt-8 text-base font-semibold">{doc.title}</p>}

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-ink text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 font-semibold">Omschrijving</th>
            <th className="py-2 text-right font-semibold">Aantal</th>
            <th className="hidden py-2 text-right font-semibold sm:table-cell print:table-cell">Prijs</th>
            <th className="hidden py-2 text-right font-semibold sm:table-cell print:table-cell">Btw</th>
            <th className="py-2 text-right font-semibold">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-line align-top">
              <td className="py-2 pr-2">{l.description || "—"}</td>
              <td className="py-2 text-right whitespace-nowrap">
                {String(l.quantity).replace(".", ",")} {l.unit}
              </td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell print:table-cell">{eur(l.unitPriceCents)}</td>
              <td className="hidden py-2 text-right sm:table-cell print:table-cell">
                {company.kor ? "—" : l.vatRate === "verlegd" ? "verl." : `${l.vatRate}%`}
              </td>
              <td className="py-2 text-right tabular-nums">{eur(lineTotal(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs space-y-1">
        <Row label="Subtotaal" value={eur(t.subtotal)} />
        {t.discount > 0 && <Row label="Korting" value={`− ${eur(t.discount)}`} />}
        {!company.kor &&
          t.vatLines.map((v) => (
            <Row
              key={v.rate}
              label={v.rate === "verlegd" ? `Btw verlegd (over ${eur(v.base)})` : `Btw ${v.rate}% over ${eur(v.base)}`}
              value={eur(v.vat)}
            />
          ))}
        <div className="flex justify-between border-t-2 border-ink pt-2 text-base font-bold">
          <span>Totaal</span>
          <span className="tabular-nums">{eur(t.total)}</span>
        </div>
      </div>

      {company.kor && <p className="mt-4 text-sm text-muted">Vrijgesteld van btw op grond van de kleineondernemersregeling (KOR).</p>}
      {hasReverse && !company.kor && (
        <p className="mt-4 text-sm text-muted">
          Btw verlegd{client?.btwId ? ` naar ${client.btwId}` : ""}.
        </p>
      )}

      {doc.notesPublic && <p className="mt-6 whitespace-pre-line">{doc.notesPublic}</p>}

      {!isQuote && (
        <p className="mt-6 rounded-xl bg-brand-soft p-4">
          Graag {eur(t.total)} overmaken vóór {formatDate(doc.dueDate)} op <strong>{company.iban || "—"}</strong> t.n.v.{" "}
          {company.name}, onder vermelding van <strong>{doc.number}</strong>.
        </p>
      )}

      <footer className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {company.name} · KvK {company.kvk || "—"} · Btw {company.btwId || "—"} · IBAN {company.iban || "—"}
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
