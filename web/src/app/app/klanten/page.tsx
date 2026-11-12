import { listClients } from "@/lib/data";
import { saveClient } from "@/lib/actions";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Klanten</h1>
      {clients.length === 0 ? (
        <p className="card p-6 text-muted">Nog geen klanten. Je kunt ze ook direct toevoegen vanuit een offerte.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {clients.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-muted">
                {[c.email, [c.address, c.postcode, c.city].filter(Boolean).join(", "), c.btwId && `btw ${c.btwId}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">+ Klant toevoegen</summary>
        <form action={saveClient} className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["name", "Naam *"],
            ["contactName", "Contactpersoon"],
            ["email", "E-mail"],
            ["phone", "Telefoon"],
            ["address", "Adres"],
            ["postcode", "Postcode"],
            ["city", "Plaats"],
            ["btwId", "Btw-nummer"],
          ].map(([n, l]) => (
            <div key={n} className="space-y-1">
              <label htmlFor={n}>{l}</label>
              <input id={n} name={n} required={n === "name"} />
            </div>
          ))}
          <button className="btn-primary sm:col-span-2 sm:justify-self-start">Opslaan</button>
        </form>
      </details>
    </div>
  );
}
