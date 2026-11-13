import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, type Company } from "@/db/schema";
import { call, form } from "./stripe";

/**
 * Klusnota's own subscription (hard paywall), billed on MK Studio's Stripe account.
 * Separate from the contractor's own Stripe/Mollie key, which only collects their invoices.
 * No webhook: state is synced on checkout return, after portal visits, and lazily when the
 * stored period end has passed.
 */

export const PLANS = {
  maand: { label: "Per maand", cents: 1200, interval: "month", note: "Maandelijks opzegbaar" },
  jaar: { label: "Per jaar", cents: 12000, interval: "year", note: "2 maanden gratis" },
} as const;
export type Plan = keyof typeof PLANS;

export const TRIAL_DAYS = Number(process.env.BILLING_TRIAL_DAYS ?? 14);
const key = () => process.env.BILLING_STRIPE_KEY ?? "";
export const billingConfigured = () => key().length > 0;
export const billingDisabled = () => process.env.BILLING_DISABLED === "1";

type Sub = {
  id: string;
  status: string;
  customer: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata?: Record<string, string>;
  items?: { data: { price: { recurring?: { interval: string } } }[] };
};

const OPEN = new Set(["trialing", "active", "past_due"]);

export function hasAccess(c: Company) {
  if (billingDisabled()) return true;
  return OPEN.has(c.subStatus) && c.subPeriodEnd > new Date().toISOString();
}

async function store(companyId: string, s: Sub) {
  const interval = s.items?.data[0]?.price.recurring?.interval;
  const values = {
    subId: s.id,
    subCustomerId: s.customer,
    subStatus: s.status,
    subPlan: interval === "year" ? "jaar" : interval === "month" ? "maand" : "",
    subPeriodEnd: new Date(s.current_period_end * 1000).toISOString(),
    subCancelAtEnd: s.cancel_at_period_end,
    subCheckedAt: new Date().toISOString(),
  };
  await db.update(companies).set(values).where(eq(companies.id, companyId));
  return values;
}

/** Re-reads the subscription from Stripe when the stored state may be stale. Returns the fresh company. */
export async function refreshIfStale(c: Company): Promise<Company> {
  if (!billingConfigured() || hasAccess(c)) return c;
  const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  if (c.subCheckedAt > tenMinAgo) return c;
  try {
    let sub: Sub | null = null;
    if (c.subId) {
      sub = await call<Sub>(key(), `/subscriptions/${encodeURIComponent(c.subId)}`);
    } else {
      // Checkout finished but the browser never came back to the success page.
      const q = encodeURIComponent(`metadata['companyId']:'${c.id}'`);
      const found = await call<{ data: Sub[] }>(key(), `/subscriptions/search?query=${q}&limit=1`);
      sub = found.data[0] ?? null;
    }
    if (sub) return { ...c, ...(await store(c.id, sub)) };
    await db.update(companies).set({ subCheckedAt: new Date().toISOString() }).where(eq(companies.id, c.id));
  } catch (e) {
    console.error("[billing] refresh failed", e);
  }
  return c;
}

export async function startCheckout(c: Company, plan: Plan, base: string) {
  const p = PLANS[plan];
  const envPrice = plan === "maand" ? process.env.BILLING_PRICE_MONTH : process.env.BILLING_PRICE_YEAR;
  const line = envPrice
    ? { "line_items[0][price]": envPrice }
    : {
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": p.cents,
        "line_items[0][price_data][recurring][interval]": p.interval,
        "line_items[0][price_data][tax_behavior]": "exclusive",
        "line_items[0][price_data][product_data][name]": "Klusnota",
      };
  const session = await call<{ url: string }>(key(), "/checkout/sessions", {
    method: "POST",
    body: form({
      mode: "subscription",
      locale: "nl",
      "line_items[0][quantity]": 1,
      ...line,
      "line_items[0][tax_rates][0]": process.env.BILLING_TAX_RATE || undefined,
      "subscription_data[trial_period_days]": TRIAL_DAYS > 0 ? TRIAL_DAYS : undefined,
      "subscription_data[metadata][companyId]": c.id,
      payment_method_collection: "always",
      billing_address_collection: "required",
      "tax_id_collection[enabled]": "true",
      ...(c.subCustomerId ? { customer: c.subCustomerId } : { customer_email: c.email || undefined }),
      client_reference_id: c.id,
      success_url: `${base}/abonnement/klaar?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/abonnement`,
    }),
  });
  return session.url;
}

export async function finishCheckout(c: Company, sessionId: string) {
  const s = await call<{ client_reference_id: string; subscription: Sub | null }>(
    key(),
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
  );
  if (s.client_reference_id !== c.id || !s.subscription) return false;
  await store(c.id, s.subscription);
  return true;
}

export async function syncNow(c: Company) {
  if (!c.subId) return;
  await store(c.id, await call<Sub>(key(), `/subscriptions/${encodeURIComponent(c.subId)}`));
}

export async function setCancelAtEnd(c: Company, cancel: boolean) {
  const s = await call<Sub>(key(), `/subscriptions/${encodeURIComponent(c.subId)}`, {
    method: "POST",
    body: form({ cancel_at_period_end: String(cancel) }),
  });
  await store(c.id, s);
}

/** Stripe's customer portal for card changes and invoices. Creates a portal configuration on first use. */
export async function portalUrl(c: Company, returnUrl: string) {
  const list = await call<{ data: { id: string }[] }>(key(), "/billing_portal/configurations?active=true&limit=1");
  let config = list.data[0]?.id;
  if (!config) {
    const created = await call<{ id: string }>(key(), "/billing_portal/configurations", {
      method: "POST",
      body: form({
        "business_profile[headline]": "Klusnota: je abonnement",
        "features[invoice_history][enabled]": "true",
        "features[payment_method_update][enabled]": "true",
        "features[customer_update][enabled]": "true",
        "features[customer_update][allowed_updates][0]": "address",
        "features[customer_update][allowed_updates][1]": "tax_id",
        "features[customer_update][allowed_updates][2]": "name",
        "features[subscription_cancel][enabled]": "true",
        "features[subscription_cancel][mode]": "at_period_end",
      }),
    });
    config = created.id;
  }
  const s = await call<{ url: string }>(key(), "/billing_portal/sessions", {
    method: "POST",
    body: form({ customer: c.subCustomerId, return_url: returnUrl, configuration: config, locale: "nl" }),
  });
  return s.url;
}
