import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.team_role && me.team_role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  logEvent({
    action_type: "project_added",
    detail:      `Project "${name}" added for ${clientName}`,
    entity_id:   ref.id,
    entity_type: "project",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({
    id: ref.id, name, client_id, color: color ?? "#4a4fe0",
    description: description ?? "",
    clients: { name: clientName, company: clientCompany },
    created_at: new Date().toISOString(),
  });
}
