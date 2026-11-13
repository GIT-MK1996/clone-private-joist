import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authUrl, googleEnabled, STATE_COOKIE } from "@/lib/google";
import { randomToken } from "@/lib/secure";
import { baseUrl } from "@/lib/url";

export async function GET() {
  if (!googleEnabled()) redirect("/login");
  const state = randomToken();
  (await cookies()).set(STATE_COOKIE, state, {
    maxAge: 600,
    path: "/api/auth/google",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(authUrl(await baseUrl(), state));
}
