import Link from "next/link";
import { Logo } from "@/components/Logo";

const steps = [
  ["Maak de offerte", "Op je telefoon, op de klus. Uren, materiaal, btw 21%, 9% of verlegd. Het totaal rekent zich vanzelf uit."],
  ["Stuur hem via WhatsApp", "Je klant opent de link, ziet een nette offerte en zegt met zijn naam akkoord. Jij ziet het meteen."],
  ["Eén tik: factuur", "Juist factuurnummer, alle regels overgenomen. Je klant betaalt direct met iDEAL."],
];

const promises = [
  ["Eén vaste prijs", "Geen limiet op het aantal offertes of facturen. Geen pakket dat ineens duurder wordt."],
  ["Je gegevens blijven van jou", "Stop je ooit, dan kun je al je facturen gewoon downloaden. Altijd."],
  ["Gemaakt voor je telefoon", "Groot, duidelijk, snel. Ook met werkhandschoenen en matig bereik."],
  ["Gewoon een mens aan de lijn", "Vraag? Stuur een WhatsApp. Je krijgt antwoord van iemand die je helpt, geen chatbot."],
];

function QuoteMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-3 -z-10 rotate-2 rounded-3xl bg-brand" />
      <div className="card p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Offerte O2026-014</p>
            <p className="mt-1 font-bold">Schilderwerk buitenkozijnen</p>
            <p className="text-sm text-muted">Familie Jansen · Utrecht</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Akkoord</span>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {[
            ["Arbeid schilder · 16 uur", "€ 840,00"],
            ["Verf en materiaal", "€ 245,00"],
            ["Btw 9% en 21%", "€ 122,36"],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-line pb-2">
              <span>{a}</span>
              <span className="tabular-nums">{b}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Totaal</span>
            <span className="tabular-nums">€ 1.207,36</span>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm">
          ✓ Akkoord gegeven door <strong>Anna Jansen</strong>, vandaag 14:32
        </p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <nav className="mb-12 flex items-center justify-between">
        <Logo size={26} className="text-lg" />
        <Link href="/login" className="btn-secondary">Inloggen</Link>
      </nav>

      <section className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">Voor schilders, loodgieters, elektriciens en klussers</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Je offerte de deur uit vóór je weer in de bus zit.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Klusnota maakt offertes en facturen op je telefoon. Je klant zegt online akkoord, betaalt met iDEAL, en jij bent klaar. Geen boekhoudpakket, geen gedoe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">Probeer het gratis</Link>
            <span className="text-sm text-muted">Geen wachtwoord, geen creditcard</span>
          </div>
        </div>
        <QuoteMock />
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight">Zo werkt het</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="card p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand font-bold text-brand-ink">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {promises.map(([t, d]) => (
          <div key={t} className="border-l-4 border-brand pl-4">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-1 text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-12">
        <h2 className="text-2xl font-bold text-balance sm:text-3xl">Morgen je eerste offerte versturen?</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/75">Account maken duurt een minuut. Je hoeft niets te installeren.</p>
        <Link href="/login" className="btn-primary mt-6 px-6 py-3 text-base">Probeer het gratis</Link>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted">
        <Logo size={18} />
        <span>Een product van MK Studio · support@mkstudios.nl</span>
      </footer>
    </main>
  );
}
