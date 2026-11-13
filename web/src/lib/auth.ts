import "server-only";
import { randomInt, randomUUID } from "crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ready } from "@/db";
import { companies, loginTokens, sessions, users } from "@/db/schema";
import { randomToken, sha256 } from "./secure";

export const SESSION_COOKIE = "wb_session";
const SESSION_DAYS = 60;
const LOGIN_MINUTES = 20;

const now = () => new Date();
const iso = (d: Date) => d.toISOString();

const MAX_CODE_ATTEMPTS = 5;
const codeHash = (email: string, code: string) => sha256(`${email}:${code}`);

/** A link token plus a 6-digit code, so you can request on the phone and read the mail on the pc. */
export async function createLoginToken(email: string) {
  await ready();
  const token = randomToken();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(loginTokens).values({
    tokenHash: sha256(token),
    email,
    expiresAt: iso(new Date(Date.now() + LOGIN_MINUTES * 60_000)),
    codeHash: codeHash(email, code),
  });
  return { token, code };
}

export async function userIdFor(email: string) {
  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db.insert(users).values({ id: randomUUID(), email, createdAt: iso(now()) }).returning();
  }
  return user.id;
}

/** One-time use, max 5 wrong tries per code. Returns the user id, creating the user on first login. */
export async function consumeLoginCode(email: string, code: string) {
  await ready();
  const open = and(eq(loginTokens.email, email), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, iso(now())));
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: iso(now()) })
    .where(and(open, eq(loginTokens.codeHash, codeHash(email, code)), lt(loginTokens.attempts, MAX_CODE_ATTEMPTS)))
    .returning();
  if (!row) {
    await db.update(loginTokens).set({ attempts: sql`${loginTokens.attempts} + 1` }).where(open);
    return null;
  }
  return userIdFor(email);
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
  return userIdFor(row.email);
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

/** Starts the session, clears login cookies and sends the user on. Server-only: never export this from a "use server" file. */
export async function finishLogin(userId: string): Promise<never> {
  await startSession(userId);
  const jar = await cookies();
  jar.delete({ name: "wb_devlink", path: "/login" });
  jar.delete({ name: "wb_login_email", path: "/login" });
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.userId, userId));
  redirect(company ? "/app" : "/welkom");
}
