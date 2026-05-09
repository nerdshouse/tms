export type Priority = "P0" | "P1" | "P2";
export type Status = "open" | "in_progress" | "review" | "done";
export type TicketType = "Bug" | "Feature" | "Performance";
export type AuthorType = "client" | "team";
export type TeamRole = "Admin" | "Developer" | "Designer" | "QA";
export type MemberStatus = "active" | "inactive";
export type ClientStatus = "active" | "inactive";
export type ContactStatus = "pending" | "active";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  is_admin: boolean;
  /** True when this user is an invited contact of a client (not the primary account holder) */
  is_contact?: boolean;
  /** If is_contact, this is the UID of the parent client whose data they can access */
  parent_client_id?: string;
  /** team_member ID assigned as Point of Contact for this client */
  poc_id?: string;
  /** Set only for team members who sign in — their role from team_members collection */
  team_role?: TeamRole;
  /** Set only for team members who sign in — their team_members document ID */
  team_member_id?: string;
  status: ClientStatus;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  color: string;
  description?: string;
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
  attachments?: string[];
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

/** Sub-document: clients/{clientId}/contacts/{contactId} */
export interface ClientContact {
  id: string;
  name: string;
  email: string;
  status: ContactStatus;
  created_at: string;
}
