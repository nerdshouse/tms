import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const demoUser = cookies().get("demo_user")?.value;
  if (demoUser === "admin") {
    const body = await request.json();
    return NextResponse.json({
      id: `demo-proj-${Date.now()}`, ...body,
      color: body.color ?? "#4a4fe0", created_at: new Date().toISOString(),
    });
  }

  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, client_id, color, description } = await request.json();
  if (!name || !client_id) return NextResponse.json({ error: "Name and client_id required" }, { status: 400 });

  const clientSnap    = await adminDb.collection("clients").doc(client_id).get();
  const clientName    = clientSnap.exists ? clientSnap.data()!.name    : "";
  const clientCompany = clientSnap.exists ? clientSnap.data()!.company : "";

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb.collection("projects").add({
    name,
    client_id,
    color:          color ?? "#4a4fe0",
    description:    description ?? "",
    client_name:    clientName,
    client_company: clientCompany,
    created_at:     now,
  });

  return NextResponse.json({
    id: ref.id, name, client_id, color: color ?? "#4a4fe0",
    description: description ?? "",
    clients: { name: clientName, company: clientCompany },
    created_at: new Date().toISOString(),
  });
}
