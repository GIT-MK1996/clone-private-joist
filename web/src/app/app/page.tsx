import Link from "next/link";
import { InstallTip } from "@/components/InstallTip";
import { listDocuments } from "@/lib/data";
import { createDocument } from "@/lib/actions";
import { eur, effectiveStatus, formatDate, STATUS_LABEL, STATUS_TONE } from "@/lib/calc";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "quote" } = await searchParams;
  const kind = tab === "invoice" ? "invoice" : "quote";
  const all = await listDocuments();
  const rows = all.filter((r) => r.doc.kind === kind);

  const openQuotes = all.filter((r) => r.doc.kind === "quote" && ["sent", "viewed"].includes(r.doc.status));
  const unpaid = all.filter((r) => r.doc.kind === "invoice" && ["sent", "viewed"].includes(r.doc.status));
  const overdue = unpaid.filter((r) => effectiveStatus(r.doc) === "overdue");
  const sum = (xs: typeof all) => xs.reduce((s, r) => s + r.doc.totalCents, 0);

  return (
    <div className="space-y-6">
      <InstallTip />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Openstaande offertes" value={eur(sum(openQuotes))} sub={`${openQuotes.length} wachten op akkoord`} />
        <Stat label="Nog te ontvangen" value={eur(sum(unpaid))} sub={`${unpaid.length} facturen`} />
        <Stat label="Te laat" value={eur(sum(overdue))} sub={`${overdue.length} facturen`} warn={overdue.length > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-white p-1">
          <Link href="/app?tab=quote" className={`rounded-md px-4 py-1.5 text-sm font-semibold ${kind === "quote" ? "bg-ink text-white" : "text-muted"}`}>Offertes</Link>
          <Link href="/app?tab=invoice" className={`rounded-md px-4 py-1.5 text-sm font-semibold ${kind === "invoice" ? "bg-ink text-white" : "text-muted"}`}>Facturen</Link>
        </div>
        <form action={createDocument.bind(null, kind)} className="ml-auto">
          <button className="btn-primary">+ Nieuwe {kind === "quote" ? "offerte" : "factuur"}</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-lg font-semibold">
            {kind === "quote" ? "Nog geen offertes" : "Nog geen facturen"}
          </p>
          <p className="max-w-sm text-muted">
            {kind === "quote"
              ? "Maak je eerste offerte. Je klant kan hem online goedkeuren, daarna maak je er met één tik een factuur van."
              : "Facturen maak je meestal vanuit een goedgekeurde offerte, maar het kan ook direct."}
          </p>
          <form action={createDocument.bind(null, kind)}>
            <button className="btn-primary mt-2">Maak je eerste {kind === "quote" ? "offerte" : "factuur"}</button>
          </form>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {rows.map(({ doc, clientName }) => {
            const st = effectiveStatus(doc);
            return (
              <li key={doc.id}>
                <Link href={`/app/doc/${doc.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{clientName ?? "Geen klant"}{doc.title ? ` · ${doc.title}` : ""}</p>
                    <p className="text-sm text-muted">{doc.number} · {formatDate(doc.issueDate)}</p>
                  </div>
                  <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${STATUS_TONE[st]}`}>{STATUS_LABEL[st]}</span>
                  <span className="w-24 text-right font-semibold tabular-nums">{eur(doc.totalCents)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`card p-3 sm:p-4 ${warn ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
