import "server-only";

/** "Doorgaan met Google": plain OAuth 2.0 / OpenID Connect code flow, no library. */
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const STATE_COOKIE = "wb_google_state";
export const redirectUri = (base: string) => `${base}/api/auth/google/callback`;

export function authUrl(base: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(base),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/**
 * Exchanges the code for an ID token. The token comes straight from Google's token endpoint
 * over TLS, so (per OpenID Connect) checking iss/aud/expiry is enough; no signature check needed.
 */
export async function emailFromCode(base: string, code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(base),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString()) as {
    iss: string;
    aud: string;
    exp: number;
    email?: string;
    email_verified?: boolean;
  };
  const okIss = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!okIss || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now()) return null;
  if (!claims.email || !claims.email_verified) return null;
  return claims.email.toLowerCase();
}
