/**
 * Edge middleware: gates the authenticated application shell.
 * It only checks for the presence of the session cookie — the authoritative
 * validation (signature, expiry, revocation) happens server-side in route
 * handlers and the Socket.IO handshake.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "fc_session";
const PROTECTED_PREFIXES = ["/app"];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (hasSession) return NextResponse.redirect(new URL("/app/messenger", req.url));
    return NextResponse.next();
  }

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!hasSession) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Never intercept API routes or the realtime endpoint (they return 401 JSON).
  matcher: ["/app/:path*", "/login", "/register"],
};
