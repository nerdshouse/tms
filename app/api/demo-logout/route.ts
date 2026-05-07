import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set("demo_user", "", { path: "/", maxAge: 0 });
  return response;
}
