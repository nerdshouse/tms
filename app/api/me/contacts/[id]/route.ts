import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me || me.is_admin || me.is_contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await adminDb
    .collection("clients")
    .doc(me.id)
    .collection("contacts")
    .doc(params.id)
    .delete();

  return NextResponse.json({ ok: true });
}
