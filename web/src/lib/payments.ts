import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, ready } from "@/db";
import { clients, companies, documents, events, payments } from "@/db/schema";
import { decrypt } from "./secure";
import * as mollie from "./mollie";
import * as stripe from "./stripe";

const now = () => new Date().toISOString();

/** Normalised payment status, shared by Mollie and Stripe. */
export type PayStatus = "open" | "pending" | "paid" | "canceled" | "expired" | "failed";

/** Detects the provider from the key the contractor pastes. */
export function detectProvider(key: string): { provider: "mollie" | "stripe"; mode: "test" | "live" } | null {
  const s = stripe.stripeMode(key);
  if (s) return { provider: "stripe", mode: s };
  const m = mollie.mollieMode(key);
  if (m) return { provider: "mollie", mode: m };
  return null;
}

export async function verifyProviderKey(provider: "mollie" | "stripe", key: string) {
  if (provider === "stripe") await stripe.verifyStripeKey(key);
  else await mollie.verifyKey(key);
}

async function docWithCompany(where: ReturnType<typeof eq>) {
  await ready();
  const [row] = await db
    .select({ doc: documents, company: companies })
    .from(documents)
    .innerJoin(companies, eq(companies.id, documents.companyId))
    .where(where);
  return row ?? null;
}

export const canPayOnline = (doc: { kind: string; status: string }, company: { payKeyEnc: string }) =>
  doc.kind === "invoice" && ["sent", "viewed"].includes(doc.status) && !!company.payKeyEnc;

/** Creates a checkout for an invoice and returns the URL to send the client to. */
export async function startPayment(token: string, base: string) {
  const row = await docWithCompany(eq(documents.publicToken, token));
  if (!row || !canPayOnline(row.doc, row.company)) return null;
  const { doc, company } = row;
  const key = decrypt(company.payKeyEnc);
  const back = `${base}/f/${token}?betaling=terug`;
  const description = `Factuur ${doc.number} – ${company.name}`;

  let providerId: string;
  let checkout: string | null;
  if (company.payProvider === "stripe") {
    const [client] = doc.clientId ? await db.select().from(clients).where(eq(clients.id, doc.clientId)) : [];
    const s = await stripe.createCheckout(key, {
      amountCents: doc.totalCents,
      name: description,
      successUrl: back,
      cancelUrl: back,
      documentId: doc.id,
      email: client?.email,
    });
    providerId = s.id;
    checkout = s.url;
  } else {
    const p = await mollie.createPayment(key, {
      amountCents: doc.totalCents,
      description,
      redirectUrl: back,
      webhookUrl: mollie.isPublicUrl(base) ? `${base}/api/webhooks/mollie` : undefined,
      documentId: doc.id,
    });
    providerId = p.id;
    checkout = p._links.checkout?.href ?? null;
  }

  await db.insert(payments).values({
    id: randomUUID(),
    documentId: doc.id,
    provider: company.payProvider === "stripe" ? "stripe" : "mollie",
    providerId,
    amountCents: doc.totalCents,
    status: "open",
    createdAt: now(),
    updatedAt: now(),
  });
  return checkout;
}

async function fetchStatus(provider: string, key: string, id: string): Promise<{ status: PayStatus; method: string | null; amountCents: number }> {
  if (provider === "stripe") {
    const s = await stripe.getCheckout(key, id);
    const pi = typeof s.payment_intent === "object" ? s.payment_intent : null;
    const status: PayStatus =
      s.payment_status === "paid" ? "paid" : s.status === "expired" ? "expired" : s.status === "complete" ? "pending" : "open";
    return { status, method: pi?.payment_method_types?.[0] ?? null, amountCents: s.amount_total ?? 0 };
  }
  const p = await mollie.getPayment(key, id);
  const map: Record<string, PayStatus> = { open: "open", pending: "pending", authorized: "pending", paid: "paid", canceled: "canceled", expired: "expired", failed: "failed" };
  return { status: map[p.status] ?? "open", method: p.method, amountCents: Math.round(Number(p.amount.value) * 100) };
}

/**
 * Refetches the payment from the provider (never trust a webhook body) and applies it.
 * Idempotent: safe to call any number of times for the same payment.
 */
export async function syncPayment(providerId: string) {
  await ready();
  const [pay] = await db.select().from(payments).where(eq(payments.providerId, providerId));
  if (!pay) return null;
  const row = await docWithCompany(eq(documents.id, pay.documentId));
  if (!row || !row.company.payKeyEnc || row.company.payProvider !== pay.provider) return null;
  const r = await fetchStatus(pay.provider, decrypt(row.company.payKeyEnc), providerId);

  if (r.status !== pay.status || r.method !== pay.method) {
    await db.update(payments).set({ status: r.status, method: r.method, updatedAt: now() }).where(eq(payments.id, pay.id));
  }
  if (r.status === "paid" && row.doc.status !== "paid" && r.amountCents >= row.doc.totalCents) {
    await db.update(documents).set({ status: "paid", paidAt: now(), updatedAt: now() }).where(eq(documents.id, row.doc.id));
    await db.insert(events).values({
      id: randomUUID(),
      documentId: row.doc.id,
      type: "paid",
      at: now(),
      meta: JSON.stringify({ provider: pay.provider, method: r.method, providerId }),
    });
  }
  return r.status;
}

/** Latest payment attempt for an invoice, synced with the provider. Used on return and on the owner's page. */
export async function syncLatestPayment(documentId: string) {
  await ready();
  const rows = await db.select().from(payments).where(eq(payments.documentId, documentId));
  const latest = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return null;
  if (latest.status === "paid") return "paid";
  try {
    return await syncPayment(latest.providerId);
  } catch (e) {
    console.error("Payment sync failed", e);
    return latest.status;
  }
}
