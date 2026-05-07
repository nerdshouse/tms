import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") === "admin" ? "admin" : "client";

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("demo_user", role, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24h
  });
  return response;
}
