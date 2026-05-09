import type { Client } from "@/types";

/** Full admins: env-bootstrapped admins and team members with role === 'Admin'. */
export function isFullAdmin(client: Client): boolean {
  return client.is_admin && (!client.team_role || client.team_role === "Admin");
}

/** Developer-role members: team members with any non-Admin role (Developer/Designer/QA). */
export function isDeveloperRole(client: Client): boolean {
  return client.is_admin && !!client.team_role && client.team_role !== "Admin";
}
