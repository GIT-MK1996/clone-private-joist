import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, ready } from "@/db";
import { companies, documents, events, payments } from "@/db/schema";
import { decrypt } from "./secure";
import { createPayment, getPayment, isPublicUrl } from "./mollie";

const now = () => new Date().toISOString();

async function docWithCompany(where: ReturnType<typeof eq>) {
  await ready();
  const [row] = await db
    .select({ doc: documents, company: companies })
    .from(documents)
    .innerJoin(companies, eq(companies.id, documents.companyId))
    .where(where);
  return row ?? null;
}

export const canPayOnline = (doc: { kind: string; status: string }, company: { mollieKeyEnc: string }) =>
  doc.kind === "invoice" && ["sent", "viewed"].includes(doc.status) && !!company.mollieKeyEnc;

/** Creates a Mollie payment for an invoice and returns the checkout URL. */
export async function startPayment(token: string, base: string) {
  const row = await docWithCompany(eq(documents.publicToken, token));
  if (!row || !canPayOnline(row.doc, row.company)) return null;
  const { doc, company } = row;
  const key = decrypt(company.mollieKeyEnc);
  const p = await createPayment(key, {
    amountCents: doc.totalCents,
    description: `Factuur ${doc.number} – ${company.name}`,
    redirectUrl: `${base}/f/${token}?betaling=terug`,
    webhookUrl: isPublicUrl(base) ? `${base}/api/webhooks/mollie` : undefined,
    documentId: doc.id,
  });
  await db.insert(payments).values({
    id: randomUUID(),
    documentId: doc.id,
    providerId: p.id,
    amountCents: doc.totalCents,
    status: p.status,
    method: p.method,
    createdAt: now(),
    updatedAt: now(),
  });
  return p._links.checkout?.href ?? null;
}

/**
 * Refetches the payment from Mollie (never trust a webhook body) and applies it.
 * Idempotent: safe to call any number of times for the same payment.
 */
export async function syncPayment(providerId: string) {
  await ready();
  const [pay] = await db.select().from(payments).where(eq(payments.providerId, providerId));
  if (!pay) return null;
  const row = await docWithCompany(eq(documents.id, pay.documentId));
  if (!row || !row.company.mollieKeyEnc) return null;
  const p = await getPayment(decrypt(row.company.mollieKeyEnc), providerId);

  if (p.status !== pay.status || p.method !== pay.method) {
    await db.update(payments).set({ status: p.status, method: p.method, updatedAt: now() }).where(eq(payments.id, pay.id));
  }
  const paidCents = Math.round(Number(p.amount.value) * 100);
  if (p.status === "paid" && row.doc.status !== "paid" && paidCents >= row.doc.totalCents) {
    await db.update(documents).set({ status: "paid", paidAt: now(), updatedAt: now() }).where(eq(documents.id, row.doc.id));
    await db.insert(events).values({
      id: randomUUID(),
      documentId: row.doc.id,
      type: "paid",
      at: now(),
      meta: JSON.stringify({ method: p.method ?? "mollie", providerId }),
    });
  }
  return p.status;
}

/** Latest payment attempt for an invoice, synced with Mollie. Used on the return page. */
export async function syncLatestPayment(documentId: string) {
  await ready();
  const rows = await db.select().from(payments).where(eq(payments.documentId, documentId));
  const latest = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return null;
  try {
    return await syncPayment(latest.providerId);
  } catch (e) {
    console.error("Mollie sync failed", e);
    return latest.status;
  }
}
