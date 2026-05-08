import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { DEMO_TICKETS } from "@/lib/demo-data";
import { getSessionClient, adminDb, docToTicket } from "@/lib/firebase/helpers";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let tickets: Ticket[];

  if (demoUser === "admin" || demoUser === "client") {
    if (demoUser !== "admin") redirect("/");
    tickets = DEMO_TICKETS as Ticket[];
  } else {
    const me = await getSessionClient();
    if (!me?.is_admin) redirect("/");

    const snap = await adminDb.collection("tickets").get();
    tickets = snap.docs.map(docToTicket);
  }

  return <AnalyticsDashboard tickets={tickets} />;
}
