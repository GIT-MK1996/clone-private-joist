import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { finishLogin, userIdFor } from "@/lib/auth";
import { emailFromCode, STATE_COOKIE } from "@/lib/google";
import { baseUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/auth/google" });
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== expected) redirect("/login?fout=google");
  let email: string | null = null;
  try {
    email = await emailFromCode(await baseUrl(), code);
  } catch (e) {
    console.error("[google] login failed", e);
  }
  if (!email) redirect("/login?fout=google");
  await finishLogin(await userIdFor(email));
}
