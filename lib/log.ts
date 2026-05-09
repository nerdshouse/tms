import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

export type ActionType =
  | "ticket_created"
  | "ticket_deleted"
  | "ticket_status_changed"
  | "ticket_assigned"
  | "comment_posted"
  | "client_added"
  | "client_deleted"
  | "project_added"
  | "project_removed"
  | "team_member_added"
  | "team_member_updated"
  | "team_member_removed"
  | "poc_assigned"
  | "contact_added"
  | "contact_removed";

export type EntityType = "ticket" | "client" | "project" | "team_member";

/**
 * Write an audit log entry to system_logs.
 * Fire-and-forget — call without await from API routes.
 */
export async function logEvent(params: {
  action_type: ActionType;
  detail: string;
  entity_id?: string;
  entity_type?: EntityType;
  user_id?: string;
  user_name?: string;
}): Promise<void> {
  await adminDb.collection("system_logs").add({
    timestamp:   admin.firestore.FieldValue.serverTimestamp(),
    user_id:     params.user_id   ?? null,
    user_name:   params.user_name ?? null,
    action_type: params.action_type,
    detail:      params.detail,
    entity_id:   params.entity_id   ?? null,
    entity_type: params.entity_type ?? null,
  });
}
