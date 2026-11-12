import "server-only";
import { headers } from "next/headers";

/** Public base URL: APP_URL in production, otherwise derived from the request. */
export async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
