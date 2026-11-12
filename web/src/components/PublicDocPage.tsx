import { notFound } from "next/navigation";
import DocumentView from "@/components/DocumentView";
import { approveQuote, declineQuote, markViewed } from "@/lib/actions";
import { getDocumentByToken } from "@/lib/data";
import { eur, formatDate, today } from "@/lib/calc";
import { canPayOnline, syncLatestPayment } from "@/lib/payments";

/** Client-facing page for /o/[token] (quote) and /f/[token] (invoice). */
export default async function PublicDocPage({
  token,
  kind,
  betaling,
}: {
  token: string;
  kind: "quote" | "invoice";
  betaling?: string;
}) {
  let data = await getDocumentByToken(token);
  if (!data || data.doc.kind !== kind) notFound();
  await markViewed(token);

  // Back from Mollie: check the payment status right away (webhooks cannot reach localhost).
  let paymentStatus: string | null = null;
  if (kind === "invoice" && betaling === "terug") {
    paymentStatus = await syncLatestPayment(data.doc.id);
    data = (await getDocumentByToken(token))!;
  }
  const { doc, lines, client, company } = data;
  const payable = canPayOnline(doc, company);
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
      {kind === "invoice" && doc.status !== "paid" && paymentStatus && ["open", "pending", "authorized"].includes(paymentStatus) && (
        <div className="card border-sky-200 bg-sky-50 p-4">Uw betaling wordt verwerkt. Ververs deze pagina over een minuut.</div>
      )}
      {kind === "invoice" && doc.status !== "paid" && (betaling === "mislukt" || (paymentStatus && ["canceled", "expired", "failed"].includes(paymentStatus))) && (
        <div className="card border-amber-200 bg-amber-50 p-4">De betaling is niet gelukt of geannuleerd. U kunt het opnieuw proberen.</div>
      )}

      {payable && (
        <form action={`/api/pay/${token}`} method="post" className="card no-print flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-lg font-semibold">Te betalen: {eur(doc.totalCents)}</p>
            <p className="text-sm text-muted">Veilig betalen met iDEAL, Bancontact of creditcard via Mollie.</p>
          </div>
          <button className="btn-primary px-6 py-3 text-base">Betaal nu</button>
        </form>
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
