# Pricing: Klusnota

Read on 2026-11-13. Prices change, so check again before launch.

## Market

| product | plan | price per month (excl. btw unless noted) | limits | source |
| --- | --- | --- | --- | --- |
| Joist (original, US) | Basics / Pro / Elite | $10 / $17 / $32 | Basics: 5 documents per month | https://www.joist.com/pricing/ |
| Vakbon | Starter / Vakman / Bedrijf | €0 / €19 / €49 | Starter: 5 invoices per month; Vakman: unlimited | https://vakbon.nl/prijzen |
| Moneybird | Compact / Start / Groei / Compleet | €3 / €15 / €29 / €41 (btw not stated) | 1 / 200 / 500 / 1,000 sales invoices per month, €0.15 per extra | https://www.moneybird.nl/prijzen/ |
| Jortt | Starter / ZZP / MKB / Plus | €0 / €21.95 / €29.95 / €39.95 | Starter: unlimited invoices and quotes, no bookkeeping | https://www.jortt.nl/prijs/ |
| Rompslomp | Starter (from 1 Nov 2026) | €0 + €1.50 per sent invoice | 20 quotes per month free | news report, https://nieuws.nl/economie/gratis-boekhouden-wordt-zeldzaam-moneybird-stopte-ermee-rompslomp-gaat-per-factuur-rekenen |

Note: Jortt Starter is free with unlimited invoices, so "unlimited" alone is not a reason to switch. Klusnota has to win on the jobsite flow: quote on the phone, client approves online, one tap to invoice, iDEAL pay button, made for tradespeople, a person on WhatsApp.

## What reviewers said about price (from fixes.md)

- Price rises, document limits and features moved to a higher tier: 36 reviews across 5 sources (Joist, Moneybird, Rompslomp, Jortt).
- Data locked or deleted after cancelling: 7 reviews across 3 sources.

## Model (decided 2026-11-13: hard paywall)

- **Hard paywall**: after signing up, nothing works until a trial is started. **14 days free with card or iDEAL/SEPA mandate up front** (Stripe Checkout, subscription mode).
- **One plan, one price**: Klusnota, **€12 per month excl. btw** (€14.52 incl.), or **€120 per year** (2 months free).
- Unlimited quotes, invoices and clients. No feature gating.
- **Price guarantee**: your price stays the same for as long as you are a customer.
- Cancel in one click in the app. After cancelling: read-only access and export of all documents, forever.
- Later, only when asked for: a team plan (more users), around €29.

Why €12: below Vakbon (€19) and Moneybird Start (€15), clearly above "free and limited". For a tradesperson billing €50+ an hour it is less than 15 minutes of work a month. One plan matches the angle "één vaste prijs".

## Billing fixes in the product

- One-click cancel in Instellingen → Abonnement.
- An email 7 days before an annual renewal.
- No per-document charges, no surprise tier changes.
- Export (PDF + CSV) always available, also after cancelling.

## Stripe objects to create (by the user, in the MK Studio Stripe account)

- Product: "Klusnota"
- Price 1: €12.00 per month, recurring, tax behaviour exclusive
- Price 2: €120.00 per year, recurring, tax behaviour exclusive
- Stripe Tax or a fixed 21% Dutch VAT rate on the invoice (decide with the bookkeeper)
- Customer portal enabled (cancel, update card, download invoices)

## Built (2026-11-13)

- `web/src/lib/billing.ts`: Checkout with trial, lazy sync (no webhook), cancel at period end, customer portal (configuration created via the API on first use).
- `/abonnement` paywall, `/abonnement/klaar` return page, Instellingen → Abonnement, `/api/export` CSV (works without subscription).
- Env: `BILLING_STRIPE_KEY` (MK Studio secret key), optional `BILLING_PRICE_MONTH/YEAR`, `BILLING_TAX_RATE`, `BILLING_TRIAL_DAYS`, `BILLING_DISABLED`.
