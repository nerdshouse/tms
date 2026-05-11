export interface Attachment {
  url:  string;
  name: string;
  type: string;
  size: number;
}

export type Priority = "P0" | "P1" | "P2";
export type Status = "open" | "in_progress" | "review" | "done";
export type TicketType = "New" | "Existing";
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
  phone?: string;
  gst_number?: string;
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
  /** Team member IDs explicitly assigned to manage this client */
  assigned_members?: string[];
  status: ClientStatus;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  color: string;
  description?: string;
  total_hours?: number;
  toggl_project_id?: number | null;
  created_at: string;
  clients?: Pick<Client, "name" | "company">;
  ticket_count?: number;
}

export interface TogglProject {
  id: number;
  name: string;
  client_id: number | null;
  active: boolean;
}

export interface ProjectHourEntry {
  id: string;
  project_id: string;
  description: string;
  hours: number;
  date: string;
  added_by_name: string;
  toggl_entry_id?: number | null;
  created_at: string;
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
  attachments?: Attachment[];
  page_url?: string | null;
  due_date?: string | null;
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

export interface SystemLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  action_type: string;
  detail: string;
  entity_id: string | null;
  entity_type: string | null;
}
