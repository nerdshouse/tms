import { redirect } from "next/navigation";
import { getSessionClient } from "@/lib/firebase/helpers";
import { adminDb } from "@/lib/firebase/admin";
import SettingsPage from "@/components/admin/SettingsPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const snap = await adminDb.doc("settings/toggl").get();
  const toggl = snap.exists
    ? { api_token: snap.data()!.api_token ?? "", workspace_id: snap.data()!.workspace_id ?? "", last_synced_at: snap.data()!.last_synced_at ?? null }
    : { api_token: "", workspace_id: "", last_synced_at: null };

  return <SettingsPage initialToggl={toggl} />;
}
