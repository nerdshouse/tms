import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionClient, adminDb, docToProject } from "@/lib/firebase/helpers";
import { DEMO_PROJECTS, DEMO_CLIENT } from "@/lib/demo-data";

export async function GET() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  if (demoUser === "client") {
    return NextResponse.json(DEMO_PROJECTS.filter((p) => p.client_id === DEMO_CLIENT.id));
  }
  if (demoUser === "admin") {
    return NextResponse.json(DEMO_PROJECTS);
  }

  const client = await getSessionClient();
  if (!client) return NextResponse.json([], { status: 401 });

  const snap = await adminDb
    .collection("projects")
    .where("client_id", "==", client.id)
    .orderBy("created_at")
    .get();

  return NextResponse.json(snap.docs.map(docToProject));
}
