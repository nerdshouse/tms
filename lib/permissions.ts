import type { Client } from "@/types";

/** Full admins: env-bootstrapped admins and team members with role === 'Admin'. */
export function isFullAdmin(client: Client): boolean {
  return client.is_admin && (!client.team_role || client.team_role === "Admin");
}

/** Developer-role members: team members with any non-Admin role (Developer/Designer/QA). */
export function isDeveloperRole(client: Client): boolean {
  return client.is_admin && !!client.team_role && client.team_role !== "Admin";
}

/** Returns true if the developer team member has explicit access to the given client. */
export function canAccessClient(developerMemberId: string, client: Client): boolean {
  return (client.assigned_members ?? []).includes(developerMemberId);
}
