import { notFound } from "next/navigation";
import DocumentView from "@/components/DocumentView";
import { approveQuote, declineQuote, markViewed } from "@/lib/actions";
import { getDocumentByToken } from "@/lib/data";
import { eur, formatDate, today } from "@/lib/calc";

/** Client-facing page for /o/[token] (quote) and /f/[token] (invoice). */
export default async function PublicDocPage({ token, kind }: { token: string; kind: "quote" | "invoice" }) {
  const data = await getDocumentByToken(token);
  if (!data || data.doc.kind !== kind) notFound();
  await markViewed(token);
  const { doc, lines, client, company } = data;
  const expired = kind === "quote" && !!doc.validUntil && doc.validUntil < today();
  const canAnswer = kind === "quote" && ["sent", "viewed", "draft"].includes(doc.status) && !expired;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-10">
      {kind === "quote" && doc.status === "approved" && (
        <div className="card border-emerald-200 bg-emerald-50 p-4">
          ✓ Bedankt{doc.approvedName ? `, ${doc.approvedName}` : ""}! U heeft op {formatDate(doc.approvedAt)} akkoord gegeven.{" "}
          {company.name} neemt contact met u op.
        </div>
      )}
      {kind === "quote" && doc.status === "declined" && (
        <div className="card border-rose-200 bg-rose-50 p-4">U heeft deze offerte afgewezen.</div>
      )}
      {kind === "quote" && expired && doc.status !== "approved" && (
        <div className="card border-amber-200 bg-amber-50 p-4">
          Deze offerte is verlopen. Neem contact op met {company.name} voor een nieuwe offerte.
        </div>
      )}
      {kind === "invoice" && doc.status === "paid" && (
        <div className="card border-emerald-200 bg-emerald-50 p-4">✓ Deze factuur is betaald. Bedankt!</div>
      )}

      <DocumentView doc={doc} lines={lines} client={client} company={company} />

      {canAnswer && (
        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold">Gaat u akkoord met deze offerte van {eur(doc.totalCents)}?</h2>
          <form action={approveQuote.bind(null, token)} className="space-y-3">
            <label htmlFor="name">Uw naam</label>
            <input id="name" name="name" required autoComplete="name" placeholder="Voor- en achternaam" />
            <p className="text-xs text-muted">
              Door op akkoord te klikken gaat u akkoord met de offerte en de vermelde voorwaarden. Datum en tijd worden vastgelegd.
            </p>
            <button className="btn-primary w-full py-3 text-base">Akkoord</button>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Liever niet? Offerte afwijzen</summary>
            <form action={declineQuote.bind(null, token)} className="mt-3 space-y-2">
              <textarea name="reason" rows={2} placeholder="Reden (optioneel)" />
              <button className="btn-secondary">Afwijzen</button>
            </form>
          </details>
        </section>
      )}

      <p className="no-print text-center text-xs text-muted">
        <a href={`/print/${token}`} className="underline">Download als PDF</a> · Gemaakt met Werkbon
      </p>
    </main>
  );
}
