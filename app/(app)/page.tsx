import { redirect } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import { getSessionClient, adminDb, docToTicket, docToTeamMember, effectiveClientId } from "@/lib/firebase/helpers";
import type { Ticket, TeamMember } from "@/types";

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

  const queries: Promise<unknown>[] = [q.get()];
  if (isAdmin) {
    queries.push(adminDb.collection("team_members").where("status", "==", "active").get());
  }

  const results = await Promise.all(queries);
  const snap = results[0] as FirebaseFirestore.QuerySnapshot;
  const tickets: Ticket[] = snap.docs.map(docToTicket);

  let teamMembers: TeamMember[] = [];
  if (isAdmin && results[1]) {
    const tmSnap = results[1] as FirebaseFirestore.QuerySnapshot;
    teamMembers = tmSnap.docs.map(docToTeamMember);
  }

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={isAdmin}
      initialStatus={searchParams.status ?? "all"}
      initialSearch={searchParams.q ?? ""}
      clientId={!isAdmin ? effectiveClientId(client) : undefined}
      teamMembers={isAdmin ? teamMembers : undefined}
    />
  );
}
