export type Priority = "P0" | "P1" | "P2";
export type Status = "open" | "in_progress" | "review" | "done";
export type TicketType = "Bug" | "Feature" | "Performance";
export type AuthorType = "client" | "team";
export type TeamRole = "Admin" | "Developer" | "Designer" | "QA";
export type MemberStatus = "active" | "inactive";
export type ClientStatus = "active" | "inactive";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  is_admin: boolean;
  status: ClientStatus;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  color: string;
  created_at: string;
  clients?: Pick<Client, "name" | "company">;
  ticket_count?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar_initials: string;
  status: MemberStatus;
  created_at: string;
  open_ticket_count?: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  type: TicketType;
  module: string;
  client_id: string;
  project_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "name" | "company" | "email">;
  projects?: Pick<Project, "name" | "color">;
  team_members?: Pick<TeamMember, "name" | "avatar_initials">;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  message: string;
  author_type: AuthorType;
  author_name: string;
  created_at: string;
}
