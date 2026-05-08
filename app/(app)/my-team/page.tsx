import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientTeam from "@/components/ClientTeam";
import { getSessionClient, adminDb, docToContact } from "@/lib/firebase/helpers";
import type { ClientContact } from "@/types";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let contacts: ClientContact[] = [];
  let clientId = "";
  let company  = "";

  if (demoUser === "client") {
    // Demo: empty contacts list
    clientId = "demo-client-1";
    company  = "Demo Company";
  } else if (demoUser === "admin") {
    redirect("/");
  } else {
    const me = await getSessionClient();
    if (!me)           redirect("/login");
    if (me.is_admin)   redirect("/");
    if (me.is_contact) redirect("/");  // contacts can't manage their own team

    clientId = me.id;
    company  = me.company;

    const snap = await adminDb
      .collection("clients")
      .doc(me.id)
      .collection("contacts")
      .orderBy("created_at", "desc")
      .get();

    contacts = snap.docs.map(docToContact);
  }

  return <ClientTeam contacts={contacts} clientId={clientId} company={company} />;
}
