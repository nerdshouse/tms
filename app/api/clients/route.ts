import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: client } = await supabase.from("clients").select("is_admin").eq("id", user.id).single();
  return client?.is_admin ? supabase : null;
}

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, company, email, status } = await request.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

  const admin = createAdminClient();

  // Create auth user first (no password — they'll use magic link)
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    user_metadata: { name, company: company ?? "", is_admin: false },
    email_confirm: true,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const { data, error } = await admin
    .from("clients")
    .upsert({
      id: authUser.user.id,
      name,
      company: company ?? "",
      email,
      is_admin: false,
      status: status ?? "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
