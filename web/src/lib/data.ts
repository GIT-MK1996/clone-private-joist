import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, ready } from "@/db";
import { clients, companies, documents, events, lineItems } from "@/db/schema";
import { requireUser } from "./auth";
import { hasAccess, refreshIfStale } from "./billing";

/**
 * The one place that reads data. Every query is scoped to the company of the
 * logged-in user. No session → /login, no company yet → /welkom,
 * no running trial or subscription → /abonnement (hard paywall).
 * Pass { unpaid: true } only for the paywall itself, settings chrome and the export.
 */
export async function getCompany(opts?: { unpaid?: boolean }) {
  await ready();
  const user = await requireUser();
  const [company] = await db.select().from(companies).where(eq(companies.userId, user.id));
  if (!company) redirect("/welkom");
  if (opts?.unpaid) return company;
  const fresh = await refreshIfStale(company);
  if (!hasAccess(fresh)) redirect("/abonnement");
  return fresh;
}

export async function getCompanyForUser(userId: string) {
  await ready();
  const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
  return company ?? null;
}

export async function listDocuments(kind?: "quote" | "invoice") {
  const company = await getCompany();
  const rows = await db
    .select({ doc: documents, clientName: clients.name })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .where(kind ? and(eq(documents.companyId, company.id), eq(documents.kind, kind)) : eq(documents.companyId, company.id))
    .orderBy(desc(documents.createdAt));
  return rows;
}

export async function listClients() {
  const company = await getCompany();
  return db.select().from(clients).where(eq(clients.companyId, company.id)).orderBy(asc(clients.name));
}

export async function getDocument(id: string) {
  const company = await getCompany();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.companyId, company.id)));
  if (!doc) return null;
  return loadDocParts(doc, company);
}

export async function getDocumentByToken(token: string) {
  await ready();
  const [doc] = await db.select().from(documents).where(eq(documents.publicToken, token));
  if (!doc) return null;
  const [company] = await db.select().from(companies).where(eq(companies.id, doc.companyId));
  return loadDocParts(doc, company);
}

async function loadDocParts(doc: typeof documents.$inferSelect, company: typeof companies.$inferSelect) {
  const lines = await db
    .select()
    .from(lineItems)
    .where(eq(lineItems.documentId, doc.id))
    .orderBy(asc(lineItems.position));
  const client = doc.clientId
    ? ((await db.select().from(clients).where(eq(clients.id, doc.clientId)))[0] ?? null)
    : null;
  const history = await db
    .select()
    .from(events)
    .where(eq(events.documentId, doc.id))
    .orderBy(desc(events.at));
  const invoices = doc.kind === "quote"
    ? await db.select({ id: documents.id, number: documents.number }).from(documents).where(eq(documents.sourceQuoteId, doc.id))
    : [];
  return { doc, lines, client, company, history, invoices };
}
