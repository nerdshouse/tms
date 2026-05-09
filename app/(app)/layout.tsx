import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getSessionClient, adminDb, docToProject, docToTeamMember, effectiveClientId } from "@/lib/firebase/helpers";
import type { Project, TeamMember } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionClient = await getSessionClient();
  if (!sessionClient) redirect("/login");
  const client = sessionClient;

  const queryClientId = effectiveClientId(client);

  const projectsQuery = client.is_admin
    ? adminDb.collection("projects").orderBy("created_at")
    : adminDb.collection("projects").where("client_id", "==", queryClientId).orderBy("created_at");

  const queries: Promise<unknown>[] = [
    projectsQuery.get(),
    adminDb.collection("tickets").select("project_id").get(),
  ];

  if (!client.is_admin && client.poc_id) {
    queries.push(adminDb.collection("team_members").doc(client.poc_id).get());
  }

  const results = await Promise.all(queries);
  const projectsSnap = results[0] as FirebaseFirestore.QuerySnapshot;
  const ticketsSnap  = results[1] as FirebaseFirestore.QuerySnapshot;

  const countMap: Record<string, number> = {};
  ticketsSnap.docs.forEach((d) => {
    const pid = d.data().project_id;
    if (pid) countMap[pid] = (countMap[pid] ?? 0) + 1;
  });

  const projects: (Project & { ticket_count: number })[] = projectsSnap.docs.map((snap) => ({
    ...docToProject(snap),
    ticket_count: countMap[snap.id] ?? 0,
  }));

  let poc: TeamMember | null = null;
  if (!client.is_admin && client.poc_id && results[2]) {
    const pocSnap = results[2] as FirebaseFirestore.DocumentSnapshot;
    if (pocSnap.exists) poc = docToTeamMember(pocSnap);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={client} projects={projects} poc={poc} />
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
