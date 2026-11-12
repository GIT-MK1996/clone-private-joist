import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import { DDL } from "./ddl";

const g = globalThis as unknown as {
  __libsql?: ReturnType<typeof createClient>;
  __dbReady?: Promise<void>;
};

const client =
  g.__libsql ??
  createClient({
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
g.__libsql = client;

export const db = drizzle(client, { schema });

export function ready() {
  g.__dbReady ??= init();
  return g.__dbReady;
}

async function init() {
  await client.execute("pragma foreign_keys = on");
  for (const stmt of DDL) await client.execute(stmt);
  const res = await client.execute("select count(*) as n from companies");
  if (Number(res.rows[0].n) > 0) return;

  // Demo data so the app is usable right away (until auth + onboarding exist).
  const now = new Date().toISOString();
  const companyId = randomUUID();
  await db.insert(schema.companies).values({
    id: companyId,
    name: "Schildersbedrijf De Vries",
    email: "info@devries-schilders.nl",
    phone: "06 12345678",
    address: "Kwastweg 12",
    postcode: "3511 AB",
    city: "Utrecht",
    kvk: "12345678",
    btwId: "NL001234567B01",
    iban: "NL91 ABNA 0417 1643 00",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.clients).values([
    {
      id: randomUUID(),
      companyId,
      name: "Familie Jansen",
      email: "jansen@example.nl",
      address: "Lindelaan 4",
      postcode: "3512 CD",
      city: "Utrecht",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      companyId,
      name: "Bouwbedrijf Bakker B.V.",
      contactName: "Pieter Bakker",
      email: "pieter@bakkerbouw.example",
      address: "Industrieweg 88",
      postcode: "3542 AD",
      city: "Utrecht",
      btwId: "NL009876543B01",
      createdAt: now,
      updatedAt: now,
    },
  ]);
}
