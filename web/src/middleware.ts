import { NextResponse, type NextRequest } from "next/server";

// Cheap gate: no session cookie means straight to /login. The real check happens server-side in requireUser().
export function middleware(req: NextRequest) {
  if (!req.cookies.get("wb_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/welkom", "/abonnement/:path*"] };
