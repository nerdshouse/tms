import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** Temporary debug endpoint — remove after login is working */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  const info: Record<string, unknown> = {
    ADMIN_EMAILS:     process.env.ADMIN_EMAILS ?? "NOT SET",
    ADMIN_EMAILS_len: (process.env.ADMIN_EMAILS ?? "").length,
  };

  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      info.token_email = decoded.email;
      info.token_uid   = decoded.uid;
    } catch (e) {
      info.token_error = String(e);
    }
  }

  return NextResponse.json(info);
}
