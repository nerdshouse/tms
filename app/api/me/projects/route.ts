import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEMO_PROJECTS, DEMO_CLIENT } from "@/lib/demo-data";

export async function GET() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  if (demoUser === "client") {
    const projects = DEMO_PROJECTS.filter((p) => p.client_id === DEMO_CLIENT.id);
    return NextResponse.json(projects);
  }
  if (demoUser === "admin") {
    return NextResponse.json(DEMO_PROJECTS);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at");

  return NextResponse.json(data ?? []);
}
