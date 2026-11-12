# Architecture: Werkbon (working name), a rebuild of Joist's core features for Dutch tradespeople

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript, server actions | one codebase for the app, the public client pages and the API; works on phones |
| styling | Tailwind CSS | fast to build; design tokens in `globals.css` |
| database | SQLite through libSQL (a local file in development, Turso in production) + Drizzle ORM | zero setup to start; one database; Turso's free tier covers the first thousands of users |
| auth | Auth.js with an email magic link (Resend) | no passwords to manage. Not in the vertical slice yet: one seeded company. |
| payments (clients) | Mollie (iDEAL, Bancontact, card) | Dutch, iDEAL at about €0.29 per payment, simple payment-link API |
| payments (subscription) | Mollie subscriptions or Stripe Billing | decide at launch |
| email | Resend | simple API, good deliverability, own domain |
| PDF | print-optimised HTML page (browser "save as PDF") in v0; `@react-pdf/renderer` or headless Chrome server-side for emailed attachments in v1 | gets a professional document out on day one |
| jobs | Vercel Cron (daily) | overdue reminders, expiring quotes |
| files | Cloudflare R2 | logos and photos, cheap |
| hosting | Vercel | zero-config Next.js |

## Schema

Tables: 8. Access rules: data-layer checks. Every query goes through `lib/data.ts` and filters on `company_id` from the session. Public pages look documents up by an unguessable `public_token`, never by id.

SQLite conventions: ids are random text (uuid), times are ISO-8601 UTC strings, money is integer cents in EUR (single currency; `currency` column kept for later), VAT rate is an integer in basis points or the value `verlegd`.

See `replica/schema.sql` and `web/src/db/schema.ts`.

## API (server actions + routes)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| action `saveCompany` | create/update company profile | owner | company fields | company | F01 |
| action `createDocument` | new draft quote/invoice with the next number | owner | kind | document id | F02 |
| action `saveDocument` | save header, client and line items, recompute totals | owner | document + lines | document | F02 |
| action `upsertClient` | create/edit client | owner | client fields | client | F02 |
| action `markSent` | status → sent, log event (email in v1) | owner | id | — | F02 |
| action `convertToInvoice` | copy approved quote into a new invoice with the next invoice number | owner | quote id | invoice id | F04 |
| action `markPaid` | manual payment | owner | id, amount | — | F05 |
| GET `/o/[token]` | public quote, logs `viewed` | anyone with the link | token | page | F03 |
| action `approveQuote` | status → approved, store name + time | anyone with the link | token, name | — | F03 |
| action `declineQuote` | status → declined, store reason | anyone with the link | token, reason | — | F03 |
| GET `/f/[token]` | public invoice, logs `viewed` | anyone with the link | token | page | F05 |
| POST `/api/pay/[token]` | create a Mollie payment, redirect to checkout | anyone with the link | token | redirect | F05 |
| GET `/print/[token]` | print/PDF layout | owner or link holder | token | page | — |

Webhooks in: `POST /api/webhooks/mollie` (payment status; refetch the payment from Mollie, never trust the body). Webhooks out: none.
Jobs: `reminders` daily at 08:00 Europe/Amsterdam: invoices past due and unpaid, at most one reminder per 7 days. `expire-quotes` daily: quotes past `valid_until` → expired.

## The parts that bite

- **Dutch invoice law:** numbers must be unbroken and unique. They are assigned in a transaction from `companies.next_invoice_no` when the invoice is created, and never reused. Drafts that get deleted leave a gap, so assign the number on create but block deletion of numbered invoices (allow "crediteren" instead, v1).
- **VAT:** compute per line, round per rate total (not per line), and show each rate separately. `verlegd` lines carry 0 VAT and print "Btw verlegd" plus the client's btw-id. KOR companies print "Vrijgesteld van btw (KOR)".
- **Time zones:** store UTC, show Europe/Amsterdam. Due dates are calendar dates (no time).
- **Idempotency:** Mollie webhooks can arrive more than once. Look up the payment by `provider_id`, update only when the status changes.
- **Races:** two invoices created at the same time must not get the same number. Use a single `UPDATE ... RETURNING` on the counter inside a transaction.
- **Rounding:** integer cents everywhere. Quantity can be a decimal (e.g. 2.5 hours), so line total = round(qty × unit_price).
- **Public links:** 24+ random characters, no enumeration, `noindex`.
- **Email deliverability:** send from the user's own domain later; reply-to = contractor's email.
- **GDPR:** clients' personal data. Delete the account means delete the company and everything under it. Invoices must be kept 7 years by the *contractor*, so offer an export before deletion.

## Build order

1. **Vertical slice** (this session): S04 dashboard, S05 quote editor, S06 invoice editor, S08 inline client, S12 public quote + approve, S13 public invoice, S18 print view, S15 company settings. Tables: companies, clients, documents, line_items, events. No auth (one seeded company), no real email or payments yet.
2. **Must-haves:** auth (S02, S03), sending email (S11), Mollie iDEAL (S13/S14 + webhook), saved items (S07/S16), status tracking, manual "paid".
3. **Should-haves:** reminders, deposit, sections, photos, KOR mode, subscription + paywall (S17), notifications.
4. **Fixes from replica-entrepreneur:** once the reviews have been read.
