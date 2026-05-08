import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware does a lightweight cookie-presence check only.
 * Full cryptographic verification of the __session cookie happens in
 * getSessionClient() (lib/firebase/helpers.ts) inside each server
 * component and API route — firebase-admin cannot be imported here
 * because middleware has its own webpack bundle that can't handle node: URIs.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Always allow demo API routes ──────────────────────────────────────
  if (
    pathname.startsWith("/api/demo-login") ||
    pathname.startsWith("/api/demo-logout")
  ) {
    return NextResponse.next();
  }

  // ── 2. Allow login, auth callback, and session API without auth ───────────
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/session")
  ) {
    const demoUser = request.cookies.get("demo_user")?.value;
    if (
      (demoUser === "admin" || demoUser === "client") &&
      pathname === "/login"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ── 3. Demo mode ──────────────────────────────────────────────────────────
  const demoUser = request.cookies.get("demo_user")?.value;
  if (demoUser === "admin" || demoUser === "client") {
    return NextResponse.next();
  }

  // ── 4. Real auth: presence check only ────────────────────────────────────
  // Cookie existence gates the route. The actual Firebase token verification
  // happens in getSessionClient() inside the server component/API route.
  // A tampered or expired cookie will cause getSessionClient() to return null
  // and the server component will redirect("/login").
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
