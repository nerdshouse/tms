import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware does lightweight cookie-presence / role checks only.
 * Full cryptographic verification of the __session cookie happens in
 * getSessionClient() inside each server component and API route —
 * firebase-admin cannot be imported here (node: URI webpack issue).
 *
 * The `user_role` cookie is a non-secret hint set at login; the real
 * authorization check is always enforced server-side.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Allow login, auth callback, and session API without auth ───────────
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/session")
  ) {
    return NextResponse.next();
  }

  // ── 2. Real auth: presence check only ────────────────────────────────────
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── 3. Role-based route guard (fast, non-cryptographic) ──────────────────
  // The actual role check is enforced server-side in each page/API route.
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole === "client" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
