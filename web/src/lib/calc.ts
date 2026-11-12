export type VatRate = "21" | "9" | "0" | "verlegd";

export const VAT_RATES: { value: VatRate; label: string }[] = [
  { value: "21", label: "21%" },
  { value: "9", label: "9%" },
  { value: "0", label: "0%" },
  { value: "verlegd", label: "Verlegd" },
];

export const UNITS = ["st", "uur", "m²", "m", "m³", "dag", "pakket", "liter"];

export type LineInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatRate: string;
};

export function lineTotal(l: Pick<LineInput, "quantity" | "unitPriceCents">) {
  return Math.round((Number(l.quantity) || 0) * (l.unitPriceCents || 0));
}

const RATE_ORDER = ["21", "9", "0", "verlegd"];

/** Totals for a Dutch invoice: discount spread over rates, VAT rounded per rate. */
export function computeTotals(lines: LineInput[], discountCents: number, kor = false) {
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const discount = Math.min(Math.max(discountCents || 0, 0), subtotal);
  const factor = subtotal ? (subtotal - discount) / subtotal : 0;

  const byRate = new Map<string, number>();
  for (const l of lines) {
    const rate = kor ? "0" : l.vatRate;
    byRate.set(rate, (byRate.get(rate) ?? 0) + lineTotal(l));
  }
  const vatLines = [...byRate.entries()]
    .sort((a, b) => RATE_ORDER.indexOf(a[0]) - RATE_ORDER.indexOf(b[0]))
    .map(([rate, base]) => {
      const b = Math.round(base * factor);
      const pct = rate === "verlegd" ? 0 : Number(rate);
      return { rate, base: b, vat: Math.round((b * pct) / 100) };
    });
  const vat = vatLines.reduce((s, v) => s + v.vat, 0);
  const net = subtotal - discount;
  return { subtotal, discount, net, vatLines, vat, total: net + vat };
}

const fmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
export const eur = (cents: number) => fmt.format((cents || 0) / 100);

/** Accepts "12,50", "1.250,00", "12.5", "12". */
export function parseMoney(input: string): number {
  let s = String(input).trim().replace(/[€\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centsToInput(cents: number) {
  return ((cents || 0) / 100).toFixed(2).replace(".", ",");
}

export function parseQty(input: string): number {
  const n = Number(String(input).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Concept",
  sent: "Verstuurd",
  viewed: "Bekeken",
  approved: "Akkoord",
  declined: "Afgewezen",
  expired: "Verlopen",
  paid: "Betaald",
  overdue: "Te laat",
  invoiced: "Gefactureerd",
};

export const STATUS_TONE: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  sent: "bg-sky-100 text-sky-800",
  viewed: "bg-indigo-100 text-indigo-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  expired: "bg-stone-200 text-stone-600",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-amber-100 text-amber-900",
  invoiced: "bg-violet-100 text-violet-800",
};

/** Sent invoices are final (NL); quotes stay editable until the client answers. */
export function isEditable(d: { kind: string; status: string }) {
  return d.kind === "invoice" ? d.status === "draft" : ["draft", "sent", "viewed"].includes(d.status);
}

/** Invoice past due and not paid → shown as overdue. */
export function effectiveStatus(d: { kind: string; status: string; dueDate: string | null }) {
  if (d.kind === "invoice" && ["sent", "viewed"].includes(d.status) && d.dueDate && d.dueDate < today())
    return "overdue";
  return d.status;
}
