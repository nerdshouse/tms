import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const demoUser = cookies().get("demo_user")?.value;
  if (demoUser === "admin") return NextResponse.json({ ok: true });

  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  // Only allow patching specific safe fields
  if ("poc_id"  in body) allowed.poc_id  = body.poc_id  ?? null;
  if ("status"  in body) allowed.status  = body.status;
  if ("company" in body) allowed.company = body.company;
  if ("name"    in body) allowed.name    = body.name;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await adminDb.collection("clients").doc(params.id).update(allowed);
  return NextResponse.json({ ok: true });
}
