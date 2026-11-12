import "server-only";

const API = "https://api.mollie.com/v2";

export type MolliePayment = {
  id: string;
  status: "open" | "canceled" | "pending" | "authorized" | "expired" | "failed" | "paid";
  method: string | null;
  amount: { value: string; currency: string };
  metadata?: { documentId?: string } | null;
  _links: { checkout?: { href: string } };
};

async function call<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mollie ${res.status}: ${body?.detail ?? body?.title ?? "onbekende fout"}`);
  return body as T;
}

export const mollieMode = (key: string) => (key.startsWith("live_") ? "live" : key.startsWith("test_") ? "test" : null);

/** Cheap check that a key works. */
export async function verifyKey(apiKey: string) {
  await call(apiKey, "/methods");
}

export function createPayment(
  apiKey: string,
  p: { amountCents: number; description: string; redirectUrl: string; webhookUrl?: string; documentId: string },
) {
  return call<MolliePayment>(apiKey, "/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: { currency: "EUR", value: (p.amountCents / 100).toFixed(2) },
      description: p.description.slice(0, 255),
      redirectUrl: p.redirectUrl,
      ...(p.webhookUrl ? { webhookUrl: p.webhookUrl } : {}),
      locale: "nl_NL",
      metadata: { documentId: p.documentId },
    }),
  });
}

export const getPayment = (apiKey: string, id: string) => call<MolliePayment>(apiKey, `/payments/${encodeURIComponent(id)}`);

/** Mollie cannot reach localhost, so no webhook there; the return page syncs instead. */
export const isPublicUrl = (base: string) => !/localhost|127\.0\.0\.1|\[::1\]|\.local(host)?\b/.test(base);
