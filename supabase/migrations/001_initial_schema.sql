-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients table (mirrors auth.users but with extra profile fields)
create table public.clients (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  company text not null default '',
  email text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tickets table
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('P0', 'P1', 'P2')) default 'P1',
  status text not null check (status in ('open', 'in_progress', 'review', 'done')) default 'open',
  type text not null check (type in ('Bug', 'Feature', 'Performance')) default 'Bug',
  module text not null default '',
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket updates / activity thread
create table public.ticket_updates (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  message text not null,
  author_type text not null check (author_type in ('client', 'team')),
  author_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on tickets
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function update_updated_at();

-- Indexes
create index tickets_client_id_idx on public.tickets(client_id);
create index tickets_status_idx on public.tickets(status);
create index ticket_updates_ticket_id_idx on public.ticket_updates(ticket_id);

-- Auto-create client profile when user signs up via magic link
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.clients (id, name, company, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'company', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
