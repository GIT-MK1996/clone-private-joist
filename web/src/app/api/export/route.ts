import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, documents } from "@/db/schema";
import { getCompany } from "@/lib/data";
import { baseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/** All documents as CSV. Works with or without a subscription: your data stays yours. */
export async function GET() {
  const company = await getCompany({ unpaid: true });
  const base = await baseUrl();
  const rows = await db
    .select({ d: documents, client: clients.name })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .where(eq(documents.companyId, company.id))
    .orderBy(desc(documents.issueDate));
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const lines = [
    ["soort", "nummer", "status", "datum", "klant", "omschrijving", "excl. btw", "btw", "totaal", "betaald op", "pdf"],
    ...rows.map(({ d, client }) => [
      d.kind === "quote" ? "offerte" : "factuur",
      d.number,
      d.status,
      d.issueDate,
      client,
      d.title,
      money(d.subtotalCents),
      money(d.vatCents),
      money(d.totalCents),
      d.paidAt ?? "",
      `${base}/print/${d.publicToken}`,
    ]),
  ];
  const csv = "﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="klusnota-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
