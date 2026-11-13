"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, ready } from "@/db";
import { companies, loginTokens } from "@/db/schema";
import { consumeLoginCode, consumeLoginToken, createLoginToken, endSession, startSession } from "./auth";
import { sendEmail, simpleHtml } from "./email";
import { baseUrl } from "./url";

const DEV_LINK_COOKIE = "wb_devlink";
const EMAIL_COOKIE = "wb_login_email";

export async function requestLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) redirect("/login?fout=email");

  await ready();
  // Max 5 links per address per 15 minutes.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const [{ n }] = await db
    .select({ n: count() })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.expiresAt, since)));
  if (n >= 5) redirect("/login?fout=teveel");

  const { token, code } = await createLoginToken(email);
  const pretty = `${code.slice(0, 3)} ${code.slice(3)}`;
  const link = `${await baseUrl()}/login/bevestig?token=${encodeURIComponent(token)}`;
  const res = await sendEmail({
    to: email,
    subject: `Je inlogcode voor Klusnota: ${pretty}`,
    text: `Je inlogcode: ${pretty}\nTyp deze code in op het apparaat waar je inlogt, of klik op deze link (20 minuten geldig):\n${link}\n\nHeb je dit niet aangevraagd? Dan kun je deze mail negeren.`,
    html: simpleHtml(
      [
        `Je inlogcode: ${pretty}`,
        "Typ de code in op het apparaat waar je inlogt, bijvoorbeeld je telefoon. Of klik op de knop als je op dit apparaat wilt inloggen. Beide zijn 20 minuten geldig.",
        "Heb je dit niet aangevraagd? Dan kun je deze mail negeren.",
      ],
      { label: "Inloggen", url: link },
    ),
  });
  if (!res.ok) redirect("/login?fout=mail");
  if (res.dev && process.env.NODE_ENV !== "production") {
    (await cookies()).set(DEV_LINK_COOKIE, link, { maxAge: 300, path: "/login", httpOnly: true, sameSite: "lax" });
  }
  (await cookies()).set(EMAIL_COOKIE, email, { maxAge: 30 * 60, path: "/login", httpOnly: true, sameSite: "lax" });
  redirect(`/login?verstuurd=1`);
}

export async function confirmCode(formData: FormData) {
  const email = (await cookies()).get(EMAIL_COOKIE)?.value ?? "";
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!email) redirect("/login?fout=verlopen");
  if (code.length !== 6) redirect("/login?verstuurd=1&fout=code");
  const userId = await consumeLoginCode(email, code);
  if (!userId) redirect("/login?verstuurd=1&fout=code");
  await finish(userId);
}

async function finish(userId: string) {
  await startSession(userId);
  const jar = await cookies();
  jar.delete({ name: DEV_LINK_COOKIE, path: "/login" });
  jar.delete({ name: EMAIL_COOKIE, path: "/login" });
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.userId, userId));
  redirect(company ? "/app" : "/welkom");
}

export async function confirmLogin(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const userId = token ? await consumeLoginToken(token) : null;
  if (!userId) redirect("/login?fout=verlopen");
  await finish(userId);
}

export async function logout() {
  await endSession();
  redirect("/login");
}
