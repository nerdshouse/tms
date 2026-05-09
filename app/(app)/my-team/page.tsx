import { redirect } from "next/navigation";
import ClientTeam from "@/components/ClientTeam";
import { getSessionClient, adminDb, docToContact } from "@/lib/firebase/helpers";
import type { ClientContact } from "@/types";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const me = await getSessionClient();
  if (!me)           redirect("/login");
  if (me.is_admin)   redirect("/");
  if (me.is_contact) redirect("/");

  const snap = await adminDb
    .collection("clients")
    .doc(me.id)
    .collection("contacts")
    .orderBy("created_at", "desc")
    .get();

  const contacts: ClientContact[] = snap.docs.map(docToContact);

  return <ClientTeam contacts={contacts} clientId={me.id} company={me.company} />;
}
