import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getSessionClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb.collection("ticket_updates").add({
    ticket_id:   params.id,
    message:     message.trim(),
    author_type: client.is_admin ? "team" : "client",
    author_name: client.name,
    created_at:  now,
  });

  // Also bump the ticket's updated_at
  await adminDb.collection("tickets").doc(params.id).update({
    updated_at: now,
  });

  return NextResponse.json({
    id:          ref.id,
    ticket_id:   params.id,
    message:     message.trim(),
    author_type: client.is_admin ? "team" : "client",
    author_name: client.name,
    created_at:  new Date().toISOString(),
  });
}
