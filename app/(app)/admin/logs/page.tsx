import { redirect } from "next/navigation";
import SystemLogs from "@/components/admin/SystemLogs";
import { getSessionClient, adminDb, docToSystemLog } from "@/lib/firebase/helpers";
import type { SystemLog } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const snap = await adminDb
    .collection("system_logs")
    .orderBy("timestamp", "desc")
    .limit(500)
    .get();

  const logs: SystemLog[] = snap.docs.map(docToSystemLog);

  return <SystemLogs initialLogs={logs} />;
}
