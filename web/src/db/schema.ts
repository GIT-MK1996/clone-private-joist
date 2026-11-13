import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull(),
});

export const loginTokens = sqliteTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(),
  method: text("method"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  payProvider: text("pay_provider").notNull().default(""),
  payKeyEnc: text("pay_key_enc").notNull().default(""),
  payMode: text("pay_mode").notNull().default(""),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  postcode: text("postcode").notNull().default(""),
  city: text("city").notNull().default(""),
  kvk: text("kvk").notNull().default(""),
  btwId: text("btw_id").notNull().default(""),
  iban: text("iban").notNull().default(""),
  kor: integer("kor", { mode: "boolean" }).notNull().default(false),
  defaultVat: text("default_vat").notNull().default("21"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(14),
  quoteValidDays: integer("quote_valid_days").notNull().default(30),
  nextQuoteNo: integer("next_quote_no").notNull().default(1),
  nextInvoiceNo: integer("next_invoice_no").notNull().default(1),
  subCustomerId: text("sub_customer_id").notNull().default(""),
  subId: text("sub_id").notNull().default(""),
  subStatus: text("sub_status").notNull().default(""),
  subPlan: text("sub_plan").notNull().default(""),
  subPeriodEnd: text("sub_period_end").notNull().default(""),
  subCancelAtEnd: integer("sub_cancel_at_end", { mode: "boolean" }).notNull().default(false),
  subCheckedAt: text("sub_checked_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  postcode: text("postcode").notNull().default(""),
  city: text("city").notNull().default(""),
  btwId: text("btw_id").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  clientId: text("client_id"),
  kind: text("kind", { enum: ["quote", "invoice"] }).notNull(),
  number: text("number").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  validUntil: text("valid_until"),
  dueDate: text("due_date"),
  title: text("title").notNull().default(""),
  discountCents: integer("discount_cents").notNull().default(0),
  notesPublic: text("notes_public").notNull().default(""),
  notesPrivate: text("notes_private").notNull().default(""),
  publicToken: text("public_token").notNull(),
  sourceQuoteId: text("source_quote_id"),
  sentAt: text("sent_at"),
  viewedAt: text("viewed_at"),
  approvedAt: text("approved_at"),
  approvedName: text("approved_name"),
  declinedReason: text("declined_reason"),
  paidAt: text("paid_at"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  vatCents: integer("vat_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  currency: text("currency").notNull().default("EUR"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const lineItems = sqliteTable("line_items", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  position: integer("position").notNull(),
  description: text("description").notNull().default(""),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("st"),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  vatRate: text("vat_rate").notNull().default("21"),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  type: text("type").notNull(),
  at: text("at").notNull(),
  meta: text("meta").notNull().default("{}"),
});

export type Company = typeof companies.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Doc = typeof documents.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
