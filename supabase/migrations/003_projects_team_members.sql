-- Add status to clients
alter table public.clients add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive'));

-- Projects table
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  color text not null default '#4a4fe0',
  created_at timestamptz not null default now()
);

create index projects_client_id_idx on public.projects(client_id);

-- Team members table (Nerdshouse internal team, not auth users)
create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('Admin', 'Developer', 'Designer', 'QA')),
  avatar_initials text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- Add project_id and assignee_id to tickets
alter table public.tickets
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists assignee_id uuid references public.team_members(id) on delete set null;

create index tickets_project_id_idx on public.tickets(project_id);
create index tickets_assignee_id_idx on public.tickets(assignee_id);
