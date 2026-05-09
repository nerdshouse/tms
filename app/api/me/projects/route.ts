import { NextResponse } from "next/server";
import { getSessionClient, adminDb, docToProject } from "@/lib/firebase/helpers";

export async function GET() {
  const client = await getSessionClient();
  if (!client) return NextResponse.json([], { status: 401 });

  try {
    const snap = await adminDb
      .collection("projects")
      .where("client_id", "==", client.id)
      .orderBy("created_at")
      .get();

    return NextResponse.json(snap.docs.map(docToProject));
  } catch (err) {
    console.error("[/api/me/projects] Firestore error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
