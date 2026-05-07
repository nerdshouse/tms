import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { DEMO_ADMIN, DEMO_CLIENT } from "@/lib/demo-data";
import type { Client } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let client: Client;

  if (demoUser === "admin" || demoUser === "client") {
    client = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!data) redirect("/login");
    client = data as Client;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={client} />
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
