import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createCompany } from "@/lib/actions";
import { getCompanyForUser } from "@/lib/data";

export const metadata: Metadata = { title: "Welkom – Werkbon" };
export const dynamic = "force-dynamic";

const fields: [string, string, string?, boolean?][] = [
  ["name", "Bedrijfsnaam *", "Bijv. Schildersbedrijf De Vries", true],
  ["phone", "Telefoon", "06 12345678"],
  ["address", "Adres", "Straat en huisnummer"],
  ["postcode", "Postcode", "1234 AB"],
  ["city", "Plaats"],
  ["kvk", "KvK-nummer", "8 cijfers"],
  ["btwId", "Btw-identificatienummer", "NL000000000B01"],
  ["iban", "IBAN", "NL00 BANK 0000 0000 00"],
];

export default async function WelcomePage() {
  const user = await requireUser();
  if (await getCompanyForUser(user.id)) redirect("/app");
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="mb-2 text-lg font-bold tracking-tight">
        <span className="text-brand">■</span> Werkbon
      </p>
      <h1 className="text-2xl font-bold">Welkom! Eerst je bedrijfsgegevens</h1>
      <p className="mt-1 text-muted">
        Deze komen op je offertes en facturen. Alleen de naam is nu verplicht, de rest kun je later aanvullen bij Instellingen.
      </p>
      <form action={createCompany} className="card mt-6 grid gap-3 p-5 sm:grid-cols-2">
        {fields.map(([n, l, ph, req]) => (
          <div key={n} className={`space-y-1 ${n === "name" ? "sm:col-span-2" : ""}`}>
            <label htmlFor={n}>{l}</label>
            <input id={n} name={n} placeholder={ph} required={req} />
          </div>
        ))}
        <input type="hidden" name="email" value={user.email} />
        <label className="flex items-center gap-2 text-ink sm:col-span-2">
          <input type="checkbox" name="kor" />
          Ik gebruik de kleineondernemersregeling (KOR)
        </label>
        <button className="btn-primary py-3 sm:col-span-2">Aan de slag</button>
      </form>
    </main>
  );
}
