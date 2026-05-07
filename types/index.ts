export type Priority = "P0" | "P1" | "P2";
export type Status = "open" | "in_progress" | "review" | "done";
export type TicketType = "Bug" | "Feature" | "Performance";
export type AuthorType = "client" | "team";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  is_admin: boolean;
  created_at: string;
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
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "name" | "company" | "email">;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  message: string;
  author_type: AuthorType;
  author_name: string;
  created_at: string;
}
