import { redirect } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import { getSessionClient, adminDb, docToTicket, effectiveClientId } from "@/lib/firebase/helpers";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const client = await getSessionClient();
  if (!client) redirect("/login");
  const isAdmin = client.is_admin;

  let q = adminDb
    .collection("tickets")
    .orderBy("updated_at", "desc") as FirebaseFirestore.Query;

  if (!isAdmin) {
    q = q.where("client_id", "==", effectiveClientId(client));
  }
  if (searchParams.status && searchParams.status !== "all") {
    q = q.where("status", "==", searchParams.status);
  }

  const snap = await q.get();
  const tickets: Ticket[] = snap.docs.map(docToTicket);

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={isAdmin}
      initialStatus={searchParams.status ?? "all"}
      initialSearch={searchParams.q ?? ""}
      clientId={!isAdmin ? effectiveClientId(client) : undefined}
    />
  );
}
