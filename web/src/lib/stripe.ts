import "server-only";

const API = "https://api.stripe.com/v1";

export type StripeSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | { id: string; payment_method_types?: string[] } | null;
};

/** Stripe's REST API takes form-encoded bodies with bracket notation. */
export function form(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, String(v));
  return p;
}

export async function call<T>(key: string, path: string, init?: { method?: string; body?: URLSearchParams }): Promise<T> {
  const res = await fetch(API + path, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${body?.error?.message ?? "onbekende fout"}`);
  return body as T;
}

/** sk_ = secret key, rk_ = restricted key. Publishable keys (pk_) cannot create payments. */
export const stripeMode = (key: string) =>
  /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : null;

export async function verifyStripeKey(key: string) {
  await call(key, "/checkout/sessions?limit=1");
}

export function createCheckout(
  key: string,
  p: { amountCents: number; name: string; successUrl: string; cancelUrl: string; documentId: string; email?: string },
) {
  return call<StripeSession>(key, "/checkout/sessions", {
    method: "POST",
    body: form({
      mode: "payment",
      locale: "nl",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": p.amountCents,
      "line_items[0][price_data][product_data][name]": p.name.slice(0, 250),
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.documentId,
      "metadata[documentId]": p.documentId,
      customer_email: p.email || undefined,
    }),
  });
}

export const getCheckout = (key: string, id: string) =>
  call<StripeSession>(key, `/checkout/sessions/${encodeURIComponent(id)}?expand[]=payment_intent`);
