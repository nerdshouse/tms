import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Always allow demo API routes ───────────────────────────────────────
  if (pathname.startsWith("/api/demo-login") || pathname.startsWith("/api/demo-logout")) {
    return NextResponse.next();
  }

  // ── 2. Always allow login + auth callback (no Supabase call needed) ───────
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    // Redirect already-authenticated demo users away from login
    const demoUser = request.cookies.get("demo_user")?.value;
    if ((demoUser === "admin" || demoUser === "client") && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ── 3. Demo mode: skip Supabase entirely ──────────────────────────────────
  const demoUser = request.cookies.get("demo_user")?.value;
  if (demoUser === "admin" || demoUser === "client") {
    return NextResponse.next();
  }

  // ── 4. Real auth: verify Supabase session ────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
