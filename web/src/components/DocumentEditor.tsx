"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Client, Company, Doc, LineItem } from "@/db/schema";
import { saveDocument } from "@/lib/actions";
import {
  UNITS,
  VAT_RATES,
  centsToInput,
  computeTotals,
  eur,
  lineTotal,
  parseMoney,
  parseQty,
} from "@/lib/calc";

type Row = { key: string; description: string; qty: string; unit: string; price: string; vatRate: string };

let k = 0;
const newKey = () => `r${Date.now()}${k++}`;

export default function DocumentEditor({
  doc,
  lines,
  clients,
  company,
}: {
  doc: Doc;
  lines: LineItem[];
  clients: Client[];
  company: Company;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // "clean" = matches what is stored (the editor remounts after every save)
  const [saved, setSaved] = useState<"clean" | "idle" | "saved" | "error">("clean");
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState<string>(doc.clientId ?? "");
  const [newClient, setNewClient] = useState({ name: "", email: "", address: "", postcode: "", city: "", btwId: "" });
  const [title, setTitle] = useState(doc.title);
  const [issueDate, setIssueDate] = useState(doc.issueDate);
  const [validUntil, setValidUntil] = useState(doc.validUntil ?? "");
  const [dueDate, setDueDate] = useState(doc.dueDate ?? "");
  const [discount, setDiscount] = useState(doc.discountCents ? centsToInput(doc.discountCents) : "");
  const [notesPublic, setNotesPublic] = useState(doc.notesPublic);
  const [notesPrivate, setNotesPrivate] = useState(doc.notesPrivate);
  const [rows, setRows] = useState<Row[]>(() =>
    (lines.length ? lines : []).map((l) => ({
      key: newKey(),
      description: l.description,
      qty: String(l.quantity).replace(".", ","),
      unit: l.unit,
      price: l.unitPriceCents ? centsToInput(l.unitPriceCents) : "",
      vatRate: l.vatRate,
    })),
  );

  const parsed = useMemo(
    () =>
      rows.map((r) => ({
        description: r.description,
        quantity: parseQty(r.qty),
        unit: r.unit,
        unitPriceCents: parseMoney(r.price),
        vatRate: r.vatRate,
      })),
    [rows],
  );
  const totals = computeTotals(parsed, parseMoney(discount), company.kor);

  const setRow = (key: string, patch: Partial<Row>) => {
    setSaved("idle");
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const addRow = () =>
    setRows((rs) => [...rs, { key: newKey(), description: "", qty: "1", unit: "st", price: "", vatRate: company.defaultVat }]);
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const moveRow = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const isNewClient = clientId === "__new";

  function save() {
    setError("");
    start(async () => {
      try {
        const res = await saveDocument({
          id: doc.id,
          clientId: isNewClient ? null : clientId || null,
          newClient: isNewClient ? newClient : null,
          title,
          issueDate,
          validUntil: doc.kind === "quote" ? validUntil || null : null,
          dueDate: doc.kind === "invoice" ? dueDate || null : null,
          discountCents: parseMoney(discount),
          notesPublic,
          notesPrivate,
          lines: parsed,
        });
        if (res.clientId) setClientId(res.clientId);
        setSaved("saved");
        router.refresh();
      } catch (e) {
        setSaved("error");
        setError(e instanceof Error ? e.message : "Opslaan mislukt");
      }
    });
  }

  const touch = <T,>(fn: (v: T) => void) => (v: T) => {
    setSaved("idle");
    fn(v);
  };

  return (
    <div className="space-y-5">
      {/* Client */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Klant</h2>
        <select value={clientId} onChange={(e) => touch(setClientId)(e.target.value)}>
          <option value="">— Kies een klant —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.city ? ` (${c.city})` : ""}
            </option>
          ))}
          <option value="__new">+ Nieuwe klant</option>
        </select>
        {isNewClient && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Naam *">
              <input autoFocus value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            </Field>
            <Field label="Adres">
              <input value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Field label="Postcode">
                <input value={newClient.postcode} onChange={(e) => setNewClient({ ...newClient, postcode: e.target.value })} />
              </Field>
              <Field label="Plaats">
                <input value={newClient.city} onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Btw-nummer (alleen bij zakelijke klant / btw verlegd)">
              <input value={newClient.btwId} onChange={(e) => setNewClient({ ...newClient, btwId: e.target.value })} />
            </Field>
          </div>
        )}
      </section>

      {/* Header fields */}
      <section className="card grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Omschrijving klus">
            <input
              placeholder="Bijv. Schilderwerk buitenkozijnen"
              value={title}
              onChange={(e) => touch(setTitle)(e.target.value)}
            />
          </Field>
        </div>
        <Field label={doc.kind === "quote" ? "Offertedatum" : "Factuurdatum"}>
          <input type="date" value={issueDate} onChange={(e) => touch(setIssueDate)(e.target.value)} />
        </Field>
        {doc.kind === "quote" ? (
          <Field label="Geldig tot">
            <input type="date" value={validUntil} onChange={(e) => touch(setValidUntil)(e.target.value)} />
          </Field>
        ) : (
          <Field label="Vervaldatum">
            <input type="date" value={dueDate} onChange={(e) => touch(setDueDate)(e.target.value)} />
          </Field>
        )}
      </section>

      {/* Lines */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Regels</h2>
        <div className="hidden grid-cols-[1fr_70px_90px_110px_100px_100px_56px] gap-2 px-1 pb-1 text-xs font-medium text-muted md:grid">
          <span>Omschrijving</span>
          <span>Aantal</span>
          <span>Eenheid</span>
          <span>Prijs excl.</span>
          <span>Btw</span>
          <span className="text-right">Totaal</span>
          <span />
        </div>
        <ul className="space-y-3 md:space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 md:grid-cols-[1fr_70px_90px_110px_100px_100px_56px] md:items-center md:border-0 md:p-0"
            >
              <input
                className="col-span-2 md:col-span-1"
                placeholder="Bijv. Arbeid schilder"
                value={r.description}
                onChange={(e) => setRow(r.key, { description: e.target.value })}
                aria-label="Omschrijving"
              />
              <input inputMode="decimal" value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} aria-label="Aantal" />
              <select value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value })} aria-label="Eenheid">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={r.price}
                onChange={(e) => setRow(r.key, { price: e.target.value })}
                aria-label="Prijs excl. btw"
              />
              <select
                value={company.kor ? "0" : r.vatRate}
                disabled={company.kor}
                onChange={(e) => setRow(r.key, { vatRate: e.target.value })}
                aria-label="Btw-tarief"
              >
                {VAT_RATES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <span className="self-center text-right font-semibold tabular-nums">{eur(lineTotal(parsed[i]))}</span>
              <span className="col-span-2 flex justify-end gap-1 md:col-span-1">
                <button type="button" className="btn-ghost px-1.5 py-1" onClick={() => moveRow(i, -1)} aria-label="Omhoog">↑</button>
                <button type="button" className="btn-ghost px-1.5 py-1 text-rose-700" onClick={() => removeRow(r.key)} aria-label="Verwijder regel">✕</button>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addRow} className="btn-secondary mt-3 w-full md:w-auto">+ Regel toevoegen</button>

        <div className="mt-5 ml-auto max-w-xs space-y-1 text-sm">
          <Line label="Subtotaal" value={eur(totals.subtotal)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Korting</span>
            <input
              inputMode="decimal"
              className="w-28 py-1 text-right"
              placeholder="0,00"
              value={discount}
              onChange={(e) => touch(setDiscount)(e.target.value)}
              aria-label="Korting in euro"
            />
          </div>
          {totals.vatLines.map((v) => (
            <Line
              key={v.rate}
              label={v.rate === "verlegd" ? `Btw verlegd over ${eur(v.base)}` : `Btw ${v.rate}% over ${eur(v.base)}`}
              value={eur(v.vat)}
            />
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
            <span>Totaal</span>
            <span className="tabular-nums">{eur(totals.total)}</span>
          </div>
          {company.kor && <p className="text-xs text-muted">KOR actief: geen btw gerekend.</p>}
        </div>
      </section>

      {/* Notes */}
      <section className="card grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Opmerking voor de klant">
          <textarea rows={3} value={notesPublic} onChange={(e) => touch(setNotesPublic)(e.target.value)} placeholder="Bijv. Inclusief 2 lagen verf, exclusief houtrotreparatie." />
        </Field>
        <Field label="Privé-notitie (ziet de klant niet)">
          <textarea rows={3} value={notesPrivate} onChange={(e) => touch(setNotesPrivate)(e.target.value)} />
        </Field>
      </section>

      <div className="no-print sticky bottom-16 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
        <span className="text-sm text-muted">
          {pending
            ? "Opslaan…"
            : saved === "saved" || saved === "clean"
              ? "Alles opgeslagen ✓"
              : saved === "error"
                ? error
                : "Je hebt wijzigingen die nog niet zijn opgeslagen"}
        </span>
        <button onClick={save} disabled={pending} className="btn-primary ml-auto">Opslaan</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
