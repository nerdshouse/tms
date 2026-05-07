import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendTeamInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("clients").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, role } = await request.json();
  if (!name || !email || !role) return NextResponse.json({ error: "Name, email and role required" }, { status: 400 });

  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .insert({ name, email, role, avatar_initials: initials, status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invite email (non-blocking)
  sendTeamInviteEmail({ name, email, role }).catch(console.error);

  return NextResponse.json(data);
}
