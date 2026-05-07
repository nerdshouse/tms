-- Enable RLS on all tables
alter table public.clients enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_updates enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from public.clients where id = auth.uid()),
    false
  );
$$;

-- clients: users can read their own row; admins can read all
create policy "clients_select_own"
  on public.clients for select
  using (id = auth.uid() or public.is_admin());

create policy "clients_update_own"
  on public.clients for update
  using (id = auth.uid());

-- tickets: clients see only their own; admins see all
create policy "tickets_select"
  on public.tickets for select
  using (client_id = auth.uid() or public.is_admin());

create policy "tickets_insert"
  on public.tickets for insert
  with check (client_id = auth.uid());

create policy "tickets_update"
  on public.tickets for update
  using (client_id = auth.uid() or public.is_admin());

-- ticket_updates: inherit access from parent ticket
create policy "ticket_updates_select"
  on public.ticket_updates for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.client_id = auth.uid() or public.is_admin())
    )
  );

create policy "ticket_updates_insert"
  on public.ticket_updates for insert
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.client_id = auth.uid() or public.is_admin())
    )
  );
