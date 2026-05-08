import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const demoUser = cookies().get("demo_user")?.value;
  if (demoUser === "admin") return NextResponse.json({ ok: true });

  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await adminDb.collection("projects").doc(params.id).delete();
  return NextResponse.json({ ok: true });
}
