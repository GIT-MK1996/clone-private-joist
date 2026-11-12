import Link from "next/link";

const points = [
  ["Offerte in 2 minuten", "Op je telefoon, op de bouwplaats. Met je eigen prijslijst en logo."],
  ["Klant zegt online akkoord", "Stuur een link via WhatsApp of mail. Je ziet wanneer hij geopend is."],
  ["Eén tik naar factuur", "Juiste factuurnummers, btw 21%, 9% of verlegd. Klopt met de Nederlandse regels."],
  ["Sneller betaald", "IBAN en betaalkenmerk op elke factuur. Binnenkort betalen met iDEAL."],
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <nav className="mb-14 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-brand">■</span> Werkbon
        </span>
        <Link href="/app" className="btn-secondary">Inloggen</Link>
      </nav>
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Offertes en facturen voor vakmensen. Klaar vóór je weer in de bus zit.
        </h1>
        <p className="mt-5 text-lg text-muted">
          Voor schilders, loodgieters, elektriciens, hoveniers en klussers. Geen boekhoudpakket, gewoon snel je werk de deur uit en je geld binnen.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="btn-primary px-6 py-3 text-base">Gratis proberen</Link>
          <span className="self-center text-sm text-muted">14 dagen gratis · geen creditcard nodig</span>
        </div>
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {points.map(([t, d]) => (
          <div key={t} className="card p-6">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-muted">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
