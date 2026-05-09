import { redirect } from "next/navigation";
import ProjectsOverview from "@/components/ProjectsOverview";
import { getSessionClient, adminDb, docToProject, effectiveClientId } from "@/lib/firebase/helpers";
import type { Project, Status } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const client = await getSessionClient();
  if (!client) redirect("/login");

  const clientId = effectiveClientId(client);

  const [projectsSnap, ticketsSnap] = await Promise.all([
    client.is_admin
      ? adminDb.collection("projects").orderBy("created_at").get()
      : adminDb.collection("projects").where("client_id", "==", clientId).orderBy("created_at").get(),
    // .select() avoids downloading full ticket documents — just need project_id + status
    client.is_admin
      ? adminDb.collection("tickets").select("project_id", "status").get()
      : adminDb
          .collection("tickets")
          .where("client_id", "==", clientId)
          .select("project_id", "status")
          .get(),
  ]);

  // Build per-project status counts
  const statusMap: Record<string, Record<Status, number>> = {};
  ticketsSnap.docs.forEach((d) => {
    const pid    = d.data().project_id as string | null;
    const status = d.data().status as Status;
    if (!pid) return;
    if (!statusMap[pid]) statusMap[pid] = { open: 0, in_progress: 0, review: 0, done: 0 };
    statusMap[pid][status] = (statusMap[pid][status] ?? 0) + 1;
  });

  const projects = projectsSnap.docs.map((snap) => ({
    ...docToProject(snap),
    statusCounts: statusMap[snap.id] ?? { open: 0, in_progress: 0, review: 0, done: 0 },
  })) as (Project & { statusCounts: Record<Status, number> })[];

  return <ProjectsOverview projects={projects} isAdmin={client.is_admin} />;
}
