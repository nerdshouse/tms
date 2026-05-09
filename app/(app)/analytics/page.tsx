import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { getSessionClient, adminDb, docToTicket } from "@/lib/firebase/helpers";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const snap = await adminDb.collection("tickets").get();
  const tickets: Ticket[] = snap.docs.map(docToTicket);

  return <AnalyticsDashboard tickets={tickets} />;
}
