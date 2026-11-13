import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DocumentEditor from "@/components/DocumentEditor";
import DocumentView from "@/components/DocumentView";
import ShareBox from "@/components/ShareBox";
import { convertToInvoice, markPaid, markSent } from "@/lib/actions";
import { getDocument, listClients } from "@/lib/data";
import { syncLatestPayment } from "@/lib/payments";
import { STATUS_LABEL, STATUS_TONE, effectiveStatus, eur, formatDate, isEditable } from "@/lib/calc";

const EVENT_LABEL: Record<string, string> = {
  created: "Aangemaakt",
  sent: "Verstuurd",
  viewed: "Bekeken door klant",
  approved: "Akkoord gegeven",
  declined: "Afgewezen",
  paid: "Betaald",
  reminder: "Herinnering verstuurd",
  invoiced: "Factuur gemaakt",
};

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data = await getDocument(id);
  if (!data) notFound();
  // An online payment may have completed since the last visit: check with the provider.
  if (data.doc.kind === "invoice" && ["sent", "viewed"].includes(data.doc.status)) {
    if ((await syncLatestPayment(data.doc.id)) === "paid") data = (await getDocument(id))!;
  }
  const { doc, lines, client, company, history, invoices } = data;
  const clients = await listClients();
  const st = effectiveStatus(doc);
  const isQuote = doc.kind === "quote";
  const editable = isEditable(doc);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${h.get("host")}`;
  const publicUrl = `${base}/${isQuote ? "o" : "f"}/${doc.publicToken}`;
  const sent = doc.status !== "draft";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/app?tab=${doc.kind}`} className="btn-ghost px-2">←</Link>
        <div>
          <h1 className="text-xl font-bold">
            {isQuote ? "Offerte" : "Factuur"} {doc.number}
          </h1>
          <p className="text-sm text-muted">
            {client?.name ?? "Nog geen klant"} · {eur(doc.totalCents)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[st]}`}>{STATUS_LABEL[st]}</span>

        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/print/${doc.publicToken}`} target="_blank" className="btn-secondary">PDF</a>
          <a href={publicUrl} target="_blank" className="btn-secondary">Bekijk als klant</a>
          {doc.status === "draft" && (
            <form action={markSent.bind(null, doc.id)}>
              <button className="btn-primary" disabled={!client || doc.totalCents === 0} title={!client ? "Kies eerst een klant en sla op" : ""}>
                Versturen
              </button>
            </form>
          )}
          {isQuote && doc.status === "approved" && (
            <form action={convertToInvoice.bind(null, doc.id)}>
              <button className="btn-primary">Maak factuur →</button>
            </form>
          )}
          {!isQuote && ["sent", "viewed"].includes(doc.status) && (
            <form action={markPaid.bind(null, doc.id)}>
              <button className="btn-primary">Markeer als betaald</button>
            </form>
          )}
        </div>
      </div>

      {doc.status === "draft" && (!client || doc.totalCents === 0) && (
        <p className="text-sm text-muted">Kies een klant, voeg regels toe en klik op Opslaan. Daarna kun je versturen.</p>
      )}

      {sent && ["sent", "viewed"].includes(doc.status) && (
        <ShareBox
          url={publicUrl}
          message={`Beste ${client?.name ?? ""}, hierbij de ${isQuote ? "offerte" : "factuur"} van ${company.name}:`}
        />
      )}

      {doc.status === "approved" && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm">
          ✓ Akkoord gegeven door <strong>{doc.approvedName}</strong> op {formatDate(doc.approvedAt)}.
        </div>
      )}
      {doc.status === "declined" && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm">
          Afgewezen{doc.declinedReason ? `: “${doc.declinedReason}”` : "."}
        </div>
      )}
      {invoices.length > 0 && (
        <p className="text-sm">
          Gefactureerd in{" "}
          {invoices.map((i) => (
            <Link key={i.id} href={`/app/doc/${i.id}`} className="font-semibold text-brand-text underline">
              factuur {i.number}
            </Link>
          ))}
        </p>
      )}

      {editable ? (
        <DocumentEditor key={doc.updatedAt} doc={doc} lines={lines} clients={clients} company={company} />
      ) : (
        <DocumentView doc={doc} lines={lines} client={client} company={company} />
      )}

      {doc.notesPrivate && !editable && (
        <div className="card p-4 text-sm">
          <p className="font-semibold">Privé-notitie</p>
          <p className="whitespace-pre-line text-muted">{doc.notesPrivate}</p>
        </div>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Geschiedenis</h2>
        <ul className="space-y-1 text-sm">
          {history.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="text-muted">
                {new Date(e.at).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
