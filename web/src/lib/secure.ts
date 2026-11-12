import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SECRET ontbreekt of is te kort (min. 32 tekens) in .env.local");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Used for third-party API keys (Mollie) at rest. */
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, enc] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
