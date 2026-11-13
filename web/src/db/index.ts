import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { DDL, MIGRATIONS } from "./ddl";

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
  for (const stmt of MIGRATIONS) {
    try {
      await client.execute(stmt);
    } catch (e) {
      if (!/duplicate column/i.test(String(e))) throw e;
    }
  }
}
