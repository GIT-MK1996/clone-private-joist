# Recon map: Joist – Estimate & Invoice Maker (web + iOS/Android)

Scope: the core loop: offerte maken → klant keurt goed → factuur → klant betaalt. Clients, saved items and company settings come along. Jobs/scheduling, financing, AI receptionist, lending and QuickBooks are out of scope.
For: Dutch tradespeople and zzp'ers (schilders, loodgieters, elektriciens, hoveniers, klusbedrijven). Web app first (works on phones), native app later.
Date: 2026-11-11

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://www.joist.com/ | core loop in their words, feature list, 1.3M contractors claim |
| 2 | pricing page | https://www.joist.com/pricing/ | Basics $10, Pro $17, Elite $32, Run $70/mo; Basics capped at 5 docs/mo |
| 3 | estimates feature page | https://www.joist.com/features/estimates/ | estimate fields, saved items, templates, e-signature, view tracking |
| 4 | invoices feature page | https://www.joist.com/features/invoices/ | convert in one tap, statuses, reminders, pay link + QR, deposits |
| 5 | help center | https://support.joistapp.com/en/ | categories only (App 88, Pro 24, Payments 55 articles); popular: send doc, add tax, logo |
| 6 | app store listing | (US listing URL returned 404) | ratings taken from marketing site: 4.9 iOS / 4.7 Play |

The user's own account was not used. Everything here comes from public pages.

## Core loop

A contractor builds a branded estimate on their phone in minutes, the client approves and signs it online, and one tap turns it into an invoice the client pays through a link.

## Dutch adaptation (where the clone differs on purpose)

- Language: Dutch throughout. Estimate = **offerte**, invoice = **factuur**.
- VAT: 21%, 9%, 0%, and **btw verlegd** (reverse charge, common for subcontractors). A VAT rate per line, with totals split by rate.
- Legally required on a Dutch invoice: an unbroken numbering sequence, invoice date, supplier name and address, **KvK number**, **btw-id**, client name and address, delivery date or period, the VAT amount per rate, and the "btw verlegd" wording plus the client's btw-id when it applies.
- Payment: **iDEAL** via Mollie or Stripe, plus the IBAN and payment reference printed on the PDF.
- Prices in euros, stored as cents.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Landing page | `/` | pitch, sign up | hero, feature blocks, pricing, CTA | — |
| S02 | Sign up / log in | `/login` | account | email + magic link / Google | default, error, sent |
| S03 | Onboarding: bedrijfsgegevens | after first login | company profile needed on every document | form, logo upload, KvK, btw-id, IBAN | empty, filled, invalid |
| S04 | Dashboard / documenten | `/app` | all quotes and invoices, open amounts | tabs (offertes/facturen), status chips, list, FAB "nieuw" | empty, filled, filtered |
| S05 | Offerte-editor | `/app/offertes/[id]` | build a quote | client picker, line items, sections, VAT per line, discount, deposit, notes (public/private), expiry, photos | new, draft, sent (read-only), approved |
| S06 | Factuur-editor | `/app/facturen/[id]` | build an invoice | same as S05 + due date, payment terms | draft, sent, overdue, paid |
| S07 | Item picker | sheet from S05/S06 | add saved items fast | search, list, "nieuw item" | empty, results, none found |
| S08 | Klant kiezen / nieuw | sheet from S05/S06 | pick or create client | search, form (name, email, phone, address, btw-id) | empty, results |
| S09 | Klantenlijst | `/app/klanten` | all clients | search, list | empty, filled |
| S10 | Klantdetail | `/app/klanten/[id]` | client info + their documents | contact card, document list | — |
| S11 | Versturen | modal from S05/S06 | email the document | to, subject, message, preview, "kopieer link" | default, sending, sent, error |
| S12 | Offerte (klantweergave) | `/o/[token]` public | client reads and approves | branded doc, "akkoord" + typed name / signature, decline | open, approved, declined, expired |
| S13 | Factuur (klantweergave) | `/f/[token]` public | client reads and pays | branded doc, "betaal met iDEAL", QR, IBAN | open, paid, overdue |
| S14 | Betaling bevestigd | `/f/[token]?paid` | thank-you page | status | success, pending, failed |
| S15 | Instellingen | `/app/instellingen` | company, VAT defaults, numbering, payment terms, email text, payments connection | forms, toggles | — |
| S16 | Opgeslagen items | `/app/items` | manage price list | list, form | empty, filled |
| S17 | Abonnement / paywall | `/app/abonnement` and when hitting a limit | upgrade | plan cards, monthly/yearly toggle | free, trial, paid, past due |
| S18 | PDF | download from S05/S06/S12/S13 | printable document | header, address blocks, table, VAT totals, footer with IBAN/KvK | — |

## Flows

```
F01 New contractor sets up
    S01 -> S02 -> S03 -> S04 (empty state with "maak je eerste offerte")
    happy path clicks: ~6
    edge: no logo, no btw-id yet (kleineondernemersregeling: VAT exempt), invalid IBAN

F02 Make and send a quote
    S04 -> S05 -> S08 (pick client) -> S07 (add items) -> S11 -> sent
    happy path clicks: ~10 with saved items. Target to beat: under 2 minutes on a phone.
    edge: new client on the fly, item not saved yet, 0% / verlegd VAT, client without email (share link via WhatsApp)

F03 Client approves the quote
    email -> S12 -> akkoord + name -> confirmation; contractor gets a notification, status = approved
    happy path clicks: 2
    edge: quote expired, already approved, client declines with a reason

F04 Quote becomes an invoice
    S05 (approved) -> "maak factuur" -> S06 (prefilled, next invoice number) -> S11
    happy path clicks: 3
    edge: deposit already paid gets subtracted, partial invoices (milestones)

F05 Client pays
    email -> S13 -> iDEAL -> bank -> S14; webhook sets status = paid
    happy path clicks: 3 plus the bank app
    edge: payment fails or is cancelled, webhook arrives twice, paid by manual bank transfer (contractor marks it paid)

F06 Overdue reminder
    daily job: invoice past due and unpaid -> reminder email -> S13
    edge: client already paid by bank transfer, reminders turned off

F07 Upgrade
    limit hit (5 documents/mo) or trial ends -> S17 -> checkout -> back to S04
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger | default, hover, focus, disabled, loading | all |
| Input / textarea | text, money, percent, date | default, focus, error, disabled | S03, S05, S06, S08, S15 |
| Select / segmented | VAT rate, status filter, monthly/yearly | — | S05, S04, S17 |
| Line item row | item, section heading | editing, read-only, dragging | S05, S06, S12, S13, S18 |
| Totals block | subtotal, discount, VAT per rate, deposit, total | — | S05, S06, S12, S13, S18 |
| Status chip | concept, verstuurd, bekeken, akkoord, afgewezen, betaald, te laat | — | S04, S05, S06, S10 |
| Bottom sheet / modal | picker, form, confirm | open, closed | S07, S08, S11 |
| Document list row | offerte, factuur | — | S04, S10 |
| Empty state | per list | — | S04, S09, S16 |
| Toast | success, error | — | all |
| Nav | bottom tabs (mobile), sidebar (desktop) | active | app |
| Signature / akkoord box | typed name, drawn | empty, signed | S12 |
| Photo attachment grid | — | uploading, done, error | S05, S06 |

## Inferred data model

```
Company     id, user_id, name, logo_url, address, postcode, city, kvk, btw_id, iban,
            default_vat, payment_terms_days, quote_valid_days, next_quote_no, next_invoice_no, kor (bool)
            evidence: pricing "logo display", "license and insurance fields", help "add or change my logo"; NL law
            confidence: high

Client      id, company_id, name, contact_name, email, phone, address, postcode, city, btw_id, notes
            evidence: client picker, "client management"
            confidence: high

Item        id, company_id, name, description, unit, unit_price_cents, vat_rate
            evidence: "saved items" on estimates page
            confidence: high

Document    id, company_id, client_id, kind (quote | invoice), number, status, issue_date,
            valid_until (quote), due_date (invoice), discount_cents/percent, deposit_cents,
            notes_public, notes_private, public_token, source_quote_id, sent_at, viewed_at,
            approved_at, approved_name, paid_at, totals cached (subtotal, vat, total)
            evidence: estimates + invoices pages (status list, conversion, deposit, notes public/private, expiry)
            confidence: high (one table for both kinds is a guess, but it fits "convert in one tap")

LineItem    id, document_id, position, kind (item | section), description, quantity, unit,
            unit_price_cents, vat_rate (21|9|0|verlegd)
            evidence: "line items", "sections"
            confidence: high

Attachment  id, document_id, file_url, kind (photo | file)
            evidence: "jobsite photos and files"
            confidence: high

Payment     id, document_id, amount_cents, method (ideal | card | bank_transfer | manual), provider_id, status, paid_at
            evidence: payments page, "track payments"
            confidence: medium

Event       id, document_id, type (sent | viewed | approved | declined | paid | reminder), at, meta
            evidence: "alerts when a customer opens, views or signs"
            confidence: medium

Subscription user_id, plan, status, period_end, provider ids
            evidence: pricing page
            confidence: high
```

Relationships: User 1-1 Company, Company 1-n Client / Item / Document, Client 1-n Document, Document 1-n LineItem / Attachment / Payment / Event, Document (quote) 1-n Document (invoice) through source_quote_id.

## Feature matrix

See `features.csv`. Must: 20, should: 11, could: 7, skip: 7.

## Out of scope (cannot or should not be cloned)

- Homeowner financing (30+ lending partners) and business loans: partner deals plus a regulated licence.
- AI receptionist: a separate product built by a third party (Zyratalk).
- Edge rewards and partner perks: partner network.
- QuickBooks sync: US-focused. The Dutch equivalent (Moneybird, e-Boekhouden, Exact) is a later could-have.
- Joist's name, logo, copy and screenshots.

## Size

Screens 18, flows 7, entities 9. Hard parts: correct Dutch invoices (numbering, VAT per rate, reverse charge), PDF generation that looks professional, iDEAL payments with idempotent webhooks. Size: **M** (a few weeks to v1; a working vertical slice in a few days).
