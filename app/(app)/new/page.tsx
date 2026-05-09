import { getSessionClient, adminDb, docToClient, docToProject } from "@/lib/firebase/helpers";
import NewRequestForm from "@/components/NewRequestForm";
import type { Client, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: { project_id?: string };
}) {
  const me = await getSessionClient();

  let adminClients: Client[] = [];
  let adminProjects: Project[] = [];

  if (me?.is_admin) {
    const [clientsSnap, projectsSnap] = await Promise.all([
      adminDb.collection("clients").where("is_admin", "==", false).get(),
      adminDb.collection("projects").get(),
    ]);
    adminClients = clientsSnap.docs.map(docToClient).sort((a, b) => a.name.localeCompare(b.name));
    adminProjects = projectsSnap.docs.map(docToProject);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted mt-0.5">Submit a bug report or feature request to the Nerdshouse team.</p>
      </div>
      <NewRequestForm
        defaultProjectId={searchParams.project_id}
        isAdmin={!!me?.is_admin}
        adminClients={adminClients}
        adminProjects={adminProjects}
      />
    </div>
  );
}
