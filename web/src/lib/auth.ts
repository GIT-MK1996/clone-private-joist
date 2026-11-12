import "server-only";
import { randomUUID } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ready } from "@/db";
import { loginTokens, sessions, users } from "@/db/schema";
import { randomToken, sha256 } from "./secure";

export const SESSION_COOKIE = "wb_session";
const SESSION_DAYS = 60;
const LOGIN_MINUTES = 20;

const now = () => new Date();
const iso = (d: Date) => d.toISOString();

export async function createLoginToken(email: string) {
  await ready();
  const token = randomToken();
  await db.insert(loginTokens).values({
    tokenHash: sha256(token),
    email,
    expiresAt: iso(new Date(Date.now() + LOGIN_MINUTES * 60_000)),
  });
  return token;
}

/** One-time use. Returns the user id, creating the user on first login. */
export async function consumeLoginToken(token: string) {
  await ready();
  const hash = sha256(token);
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: iso(now()) })
    .where(and(eq(loginTokens.tokenHash, hash), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, iso(now()))))
    .returning();
  if (!row) return null;
  let [user] = await db.select().from(users).where(eq(users.email, row.email));
  if (!user) {
    [user] = await db.insert(users).values({ id: randomUUID(), email: row.email, createdAt: iso(now()) }).returning();
  }
  return user.id;
}

export async function startSession(userId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt: iso(expires), createdAt: iso(now()) });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function getUser() {
  await ready();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, iso(now()))));
  return row ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
