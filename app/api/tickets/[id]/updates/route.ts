import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Demo mode
  const demoUser = cookies().get("demo_user")?.value;
  if (demoUser === "admin" || demoUser === "client") {
    const { message } = await request.json();
    const fake = {
      id:          `demo-update-${Date.now()}`,
      ticket_id:   params.id,
      message,
      author_type: demoUser === "admin" ? "team" : "client",
      author_name: demoUser === "admin" ? "Axit Mehta" : "Priya Sharma",
      created_at:  new Date().toISOString(),
    };
    return NextResponse.json(fake);
  }

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
