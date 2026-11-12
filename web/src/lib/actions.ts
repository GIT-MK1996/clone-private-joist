"use server";

import { randomUUID } from "crypto";
import { customAlphabet } from "nanoid";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, companies, documents, events, lineItems } from "@/db/schema";
import { getCompany, getCompanyForUser } from "./data";
import { addDays, computeTotals, eur, formatDate, isEditable, today, type LineInput } from "./calc";
import { requireUser } from "./auth";
import { sendEmail, simpleHtml } from "./email";
import { baseUrl } from "./url";
import { encrypt } from "./secure";
import { detectProvider, verifyProviderKey } from "./payments";

const token = customAlphabet("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 28);
const now = () => new Date().toISOString();

async function logEvent(documentId: string, type: string, meta: object = {}) {
  await db.insert(events).values({ id: randomUUID(), documentId, type, at: now(), meta: JSON.stringify(meta) });
}

/** Takes the next number atomically. Invoice numbers must be unbroken and unique (NL). */
async function takeNumber(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], companyId: string, kind: "quote" | "invoice") {
  const col = kind === "quote" ? companies.nextQuoteNo : companies.nextInvoiceNo;
  const [row] = await tx
    .update(companies)
    .set(kind === "quote" ? { nextQuoteNo: sql`${col} + 1` } : { nextInvoiceNo: sql`${col} + 1` })
    .where(eq(companies.id, companyId))
    .returning({ n: kind === "quote" ? companies.nextQuoteNo : companies.nextInvoiceNo });
  const n = row.n - 1;
  const year = new Date().getFullYear();
  return kind === "quote" ? `O${year}-${String(n).padStart(3, "0")}` : `${year}-${String(n).padStart(4, "0")}`;
}

export async function createDocument(kind: "quote" | "invoice") {
  const company = await getCompany();
  const id = randomUUID();
  const issue = today();
  await db.transaction(async (tx) => {
    const number = await takeNumber(tx, company.id, kind);
    await tx.insert(documents).values({
      id,
      companyId: company.id,
      kind,
      number,
      issueDate: issue,
      validUntil: kind === "quote" ? addDays(issue, company.quoteValidDays) : null,
      dueDate: kind === "invoice" ? addDays(issue, company.paymentTermsDays) : null,
      publicToken: token(),
      createdAt: now(),
      updatedAt: now(),
    });
    await tx.insert(lineItems).values({
      id: randomUUID(),
      documentId: id,
      position: 0,
      description: "",
      quantity: 1,
      unit: "st",
      unitPriceCents: 0,
      vatRate: company.defaultVat,
    });
  });
  await logEvent(id, "created");
  redirect(`/app/doc/${id}`);
}

export type SavePayload = {
  id: string;
  clientId: string | null;
  newClient?: { name: string; email: string; address: string; postcode: string; city: string; btwId: string } | null;
  title: string;
  issueDate: string;
  validUntil: string | null;
  dueDate: string | null;
  discountCents: number;
  notesPublic: string;
  notesPrivate: string;
  lines: LineInput[];
};

export async function saveDocument(p: SavePayload) {
  const company = await getCompany();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, p.id), eq(documents.companyId, company.id)));
  if (!doc) throw new Error("Document niet gevonden");
  if (!isEditable(doc)) throw new Error("Dit document kan niet meer worden aangepast");

  let clientId = p.clientId;
  if (p.newClient?.name.trim()) {
    clientId = randomUUID();
    await db.insert(clients).values({
      id: clientId,
      companyId: company.id,
      ...p.newClient,
      name: p.newClient.name.trim(),
      createdAt: now(),
      updatedAt: now(),
    });
  } else if (clientId) {
    const [c] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.companyId, company.id)));
    if (!c) clientId = null;
  }

  const lines = p.lines.filter((l) => l.description.trim() || l.unitPriceCents);
  const t = computeTotals(lines, p.discountCents, company.kor);

  await db.transaction(async (tx) => {
    await tx
      .update(documents)
      .set({
        clientId,
        title: p.title,
        issueDate: p.issueDate || today(),
        validUntil: p.validUntil,
        dueDate: p.dueDate,
        discountCents: t.discount,
        notesPublic: p.notesPublic,
        notesPrivate: p.notesPrivate,
        subtotalCents: t.subtotal,
        vatCents: t.vat,
        totalCents: t.total,
        updatedAt: now(),
      })
      .where(eq(documents.id, doc.id));
    await tx.delete(lineItems).where(eq(lineItems.documentId, doc.id));
    if (lines.length)
      await tx.insert(lineItems).values(
        lines.map((l, i) => ({
          id: randomUUID(),
          documentId: doc.id,
          position: i,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit: l.unit || "st",
          unitPriceCents: Math.round(l.unitPriceCents) || 0,
          vatRate: ["21", "9", "0", "verlegd"].includes(l.vatRate) ? l.vatRate : "21",
        })),
      );
  });
  revalidatePath(`/app/doc/${doc.id}`);
  revalidatePath("/app");
  return { ok: true, clientId };
}

async function ownDoc(id: string) {
  const company = await getCompany();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.companyId, company.id)));
  if (!doc) throw new Error("Document niet gevonden");
  return { doc, company };
}

/** Marks the document sent and, when the client has an email address, mails the link. */
export async function markSent(id: string) {
  const { doc, company } = await ownDoc(id);
  if (doc.status !== "draft") return;
  const [client] = doc.clientId ? await db.select().from(clients).where(eq(clients.id, doc.clientId)) : [];
  if (!client) throw new Error("Kies eerst een klant");

  let emailed = false;
  if (client.email) {
    const isQuote = doc.kind === "quote";
    const link = `${await baseUrl()}/${isQuote ? "o" : "f"}/${doc.publicToken}`;
    const what = isQuote ? "offerte" : "factuur";
    const lines = [
      `Beste ${client.contactName || client.name},`,
      isQuote
        ? `Hierbij de offerte${doc.title ? ` voor ${doc.title}` : ""} van ${eur(doc.totalCents)}. U kunt de offerte online bekijken en direct akkoord geven.`
        : `Hierbij de factuur ${doc.number}${doc.title ? ` voor ${doc.title}` : ""} van ${eur(doc.totalCents)}, te voldoen vóór ${formatDate(doc.dueDate)}.`,
      `Met vriendelijke groet,`,
      company.name,
    ];
    const res = await sendEmail({
      to: client.email,
      replyTo: company.email || undefined,
      subject: `${isQuote ? "Offerte" : "Factuur"} ${doc.number} van ${company.name}`,
      text: `${lines.join("\n\n")}\n\nBekijk de ${what}: ${link}`,
      html: simpleHtml(lines, { label: isQuote ? "Bekijk offerte" : "Bekijk en betaal factuur", url: link }),
    });
    if (!res.ok) throw new Error("De e-mail kon niet worden verstuurd. Probeer het opnieuw of deel de link via WhatsApp.");
    emailed = true;
  }
  await db.update(documents).set({ status: "sent", sentAt: now(), updatedAt: now() }).where(eq(documents.id, id));
  await logEvent(id, "sent", { emailed, to: emailed ? client.email : null });
  revalidatePath(`/app/doc/${id}`);
  revalidatePath("/app");
}

export async function markPaid(id: string) {
  const { doc } = await ownDoc(id);
  if (doc.kind !== "invoice" || doc.status === "paid") return;
  await db.update(documents).set({ status: "paid", paidAt: now(), updatedAt: now() }).where(eq(documents.id, id));
  await logEvent(id, "paid", { method: "manual" });
  revalidatePath(`/app/doc/${id}`);
  revalidatePath("/app");
}

export async function convertToInvoice(id: string) {
  const { doc, company } = await ownDoc(id);
  if (doc.kind !== "quote") throw new Error("Alleen offertes kunnen worden omgezet");
  const lines = await db.select().from(lineItems).where(eq(lineItems.documentId, id));
  const newId = randomUUID();
  const issue = today();
  await db.transaction(async (tx) => {
    const number = await takeNumber(tx, company.id, "invoice");
    await tx.insert(documents).values({
      id: newId,
      companyId: company.id,
      clientId: doc.clientId,
      kind: "invoice",
      number,
      issueDate: issue,
      dueDate: addDays(issue, company.paymentTermsDays),
      title: doc.title,
      discountCents: doc.discountCents,
      notesPublic: doc.notesPublic,
      publicToken: token(),
      sourceQuoteId: doc.id,
      subtotalCents: doc.subtotalCents,
      vatCents: doc.vatCents,
      totalCents: doc.totalCents,
      createdAt: now(),
      updatedAt: now(),
    });
    if (lines.length)
      await tx.insert(lineItems).values(lines.map((l) => ({ ...l, id: randomUUID(), documentId: newId })));
    await tx.update(documents).set({ status: "invoiced", updatedAt: now() }).where(eq(documents.id, id));
  });
  await logEvent(id, "invoiced", { invoiceId: newId });
  await logEvent(newId, "created", { fromQuote: doc.number });
  redirect(`/app/doc/${newId}`);
}

// ---- Public (client-facing) actions, authorised by the unguessable token ----

async function docByToken(t: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.publicToken, t));
  if (!doc) throw new Error("Niet gevonden");
  return doc;
}

export async function approveQuote(t: string, formData: FormData) {
  const doc = await docByToken(t);
  const name = String(formData.get("name") ?? "").trim();
  if (doc.kind !== "quote" || !name) return;
  if (!["sent", "viewed", "draft"].includes(doc.status)) return;
  if (doc.validUntil && doc.validUntil < today()) return;
  await db
    .update(documents)
    .set({ status: "approved", approvedAt: now(), approvedName: name.slice(0, 120), updatedAt: now() })
    .where(eq(documents.id, doc.id));
  await logEvent(doc.id, "approved", { name });
  revalidatePath(`/o/${t}`);
}

export async function declineQuote(t: string, formData: FormData) {
  const doc = await docByToken(t);
  if (doc.kind !== "quote" || !["sent", "viewed", "draft"].includes(doc.status)) return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  await db.update(documents).set({ status: "declined", declinedReason: reason, updatedAt: now() }).where(eq(documents.id, doc.id));
  await logEvent(doc.id, "declined", { reason });
  revalidatePath(`/o/${t}`);
}

export async function markViewed(t: string) {
  const doc = await docByToken(t);
  if (doc.status === "sent") {
    await db.update(documents).set({ status: "viewed", viewedAt: now() }).where(eq(documents.id, doc.id));
    await logEvent(doc.id, "viewed");
  }
}

// ---- Onboarding & settings ----

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  if (await getCompanyForUser(user.id)) redirect("/app");
  const s = (k: string) => String(formData.get(k) ?? "").trim().slice(0, 200);
  const name = s("name");
  if (!name) redirect("/welkom");
  await db.insert(companies).values({
    id: randomUUID(),
    userId: user.id,
    name,
    email: user.email,
    phone: s("phone"),
    address: s("address"),
    postcode: s("postcode"),
    city: s("city"),
    kvk: s("kvk"),
    btwId: s("btwId"),
    iban: s("iban"),
    kor: formData.get("kor") === "on",
    createdAt: now(),
    updatedAt: now(),
  });
  redirect("/app");
}

/** Accepts a Stripe secret/restricted key or a Mollie API key; detects which. */
export async function savePaymentKey(formData: FormData) {
  const company = await getCompany();
  const key = String(formData.get("payKey") ?? "").trim();
  const found = detectProvider(key);
  if (!found) redirect(`/app/instellingen?betaal=${key.startsWith("pk_") ? "publishable" : "ongeldig"}#betalingen`);
  try {
    await verifyProviderKey(found.provider, key);
  } catch (e) {
    console.error("Payment key rejected", e);
    redirect("/app/instellingen?betaal=geweigerd#betalingen");
  }
  await db
    .update(companies)
    .set({ payProvider: found.provider, payKeyEnc: encrypt(key), payMode: found.mode, updatedAt: now() })
    .where(eq(companies.id, company.id));
  redirect("/app/instellingen?betaal=ok#betalingen");
}

export async function removePaymentKey() {
  const company = await getCompany();
  await db
    .update(companies)
    .set({ payProvider: "", payKeyEnc: "", payMode: "", updatedAt: now() })
    .where(eq(companies.id, company.id));
  redirect("/app/instellingen#betalingen");
}

export async function saveCompany(formData: FormData) {
  const company = await getCompany();
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const n = (k: string, d: number) => {
    const v = parseInt(s(k), 10);
    return Number.isFinite(v) && v >= 0 && v <= 365 ? v : d;
  };
  await db
    .update(companies)
    .set({
      name: s("name") || company.name,
      email: s("email"),
      phone: s("phone"),
      address: s("address"),
      postcode: s("postcode"),
      city: s("city"),
      kvk: s("kvk"),
      btwId: s("btwId"),
      iban: s("iban"),
      kor: formData.get("kor") === "on",
      defaultVat: ["21", "9", "0", "verlegd"].includes(s("defaultVat")) ? s("defaultVat") : "21",
      paymentTermsDays: n("paymentTermsDays", 14),
      quoteValidDays: n("quoteValidDays", 30),
      updatedAt: now(),
    })
    .where(eq(companies.id, company.id));
  revalidatePath("/app", "layout");
  redirect("/app/instellingen?opgeslagen=1");
}

export async function saveClient(formData: FormData) {
  const company = await getCompany();
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const name = s("name");
  if (!name) return;
  await db.insert(clients).values({
    id: randomUUID(),
    companyId: company.id,
    name,
    contactName: s("contactName"),
    email: s("email"),
    phone: s("phone"),
    address: s("address"),
    postcode: s("postcode"),
    city: s("city"),
    btwId: s("btwId"),
    createdAt: now(),
    updatedAt: now(),
  });
  revalidatePath("/app/klanten");
}
