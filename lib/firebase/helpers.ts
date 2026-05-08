/**
 * Server-side Firebase helpers.
 * Import only in server components, API routes, and middleware.
 */
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Client, Ticket, TicketUpdate, Project, TeamMember } from "@/types";
import type { firestore } from "firebase-admin";

// ── Session helpers ───────────────────────────────────────────────────────────

/** Returns the Firebase UID of the authenticated user, or null. */
export async function getSessionUid(): Promise<string | null> {
  try {
    const sessionCookie = cookies().get("__session")?.value;
    if (!sessionCookie) return null;
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Returns the `clients` document for the logged-in user, or null. */
export async function getSessionClient(): Promise<Client | null> {
  const uid = await getSessionUid();
  if (!uid) return null;
  const snap = await adminDb.collection("clients").doc(uid).get();
  if (!snap.exists) return null;
  return docToClient(snap);
}

// ── Document converters ───────────────────────────────────────────────────────

function tsToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (typeof (val as { toDate?: unknown }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return String(val);
}

export function docToClient(snap: firestore.DocumentSnapshot): Client {
  const d = snap.data()!;
  return {
    id:         snap.id,
    name:       d.name,
    company:    d.company ?? "",
    email:      d.email,
    is_admin:   d.is_admin ?? false,
    status:     d.status ?? "active",
    created_at: tsToIso(d.created_at),
  };
}

export function docToTicket(snap: firestore.DocumentSnapshot): Ticket {
  const d = snap.data()!;
  return {
    id:          snap.id,
    title:       d.title,
    description: d.description ?? "",
    priority:    d.priority,
    status:      d.status,
    type:        d.type,
    module:      d.module ?? "",
    client_id:   d.client_id,
    project_id:  d.project_id ?? null,
    assignee_id: d.assignee_id ?? null,
    created_at:  tsToIso(d.created_at),
    updated_at:  tsToIso(d.updated_at),
    clients: d.client_name
      ? { name: d.client_name, company: d.client_company ?? "", email: d.client_email ?? "" }
      : undefined,
    projects: d.project_name
      ? { name: d.project_name, color: d.project_color ?? "#4a4fe0" }
      : undefined,
    team_members: d.assignee_name
      ? { name: d.assignee_name, avatar_initials: d.assignee_initials ?? "" }
      : undefined,
  };
}

export function docToUpdate(snap: firestore.DocumentSnapshot): TicketUpdate {
  const d = snap.data()!;
  return {
    id:          snap.id,
    ticket_id:   d.ticket_id,
    message:     d.message,
    author_type: d.author_type,
    author_name: d.author_name,
    created_at:  tsToIso(d.created_at),
  };
}

export function docToProject(snap: firestore.DocumentSnapshot): Project {
  const d = snap.data()!;
  return {
    id:         snap.id,
    name:       d.name,
    client_id:  d.client_id,
    color:      d.color ?? "#4a4fe0",
    created_at: tsToIso(d.created_at),
    clients:    d.client_name ? { name: d.client_name, company: d.client_company ?? "" } : undefined,
  };
}

export function docToTeamMember(snap: firestore.DocumentSnapshot): TeamMember {
  const d = snap.data()!;
  return {
    id:               snap.id,
    name:             d.name,
    email:            d.email,
    role:             d.role,
    avatar_initials:  d.avatar_initials,
    status:           d.status ?? "active",
    created_at:       tsToIso(d.created_at),
    open_ticket_count: d.open_ticket_count ?? 0,
  };
}

export { adminAuth, adminDb };
