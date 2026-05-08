import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import { DEMO_TICKETS, DEMO_ADMIN, DEMO_CLIENT } from "@/lib/demo-data";
import { getSessionClient, adminDb, docToTicket } from "@/lib/firebase/helpers";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let tickets: Ticket[];
  let isAdmin: boolean;

  if (demoUser === "admin" || demoUser === "client") {
    isAdmin = demoUser === "admin";
    const user = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;
    tickets = isAdmin
      ? (DEMO_TICKETS as Ticket[])
      : (DEMO_TICKETS.filter((t) => t.client_id === user.id) as Ticket[]);
  } else {
    const client = await getSessionClient();
    if (!client) redirect("/login");
    isAdmin = client.is_admin;

    let q = adminDb
      .collection("tickets")
      .orderBy("updated_at", "desc") as FirebaseFirestore.Query;

    if (!isAdmin) {
      q = q.where("client_id", "==", client.id);
    }
    if (searchParams.status && searchParams.status !== "all") {
      q = q.where("status", "==", searchParams.status);
    }

    const snap = await q.get();
    tickets = snap.docs.map(docToTicket);
  }

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={isAdmin}
      initialStatus={searchParams.status ?? "all"}
      initialSearch={searchParams.q ?? ""}
    />
  );
}
