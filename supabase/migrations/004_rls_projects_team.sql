-- RLS for projects
alter table public.projects enable row level security;

create policy "projects_select"
  on public.projects for select
  using (client_id = auth.uid() or public.is_admin());

create policy "projects_insert"
  on public.projects for insert
  with check (public.is_admin());

create policy "projects_update"
  on public.projects for update
  using (public.is_admin());

create policy "projects_delete"
  on public.projects for delete
  using (public.is_admin());

-- RLS for team_members (admin only)
alter table public.team_members enable row level security;

create policy "team_members_select"
  on public.team_members for select
  using (public.is_admin());

create policy "team_members_insert"
  on public.team_members for insert
  with check (public.is_admin());

create policy "team_members_update"
  on public.team_members for update
  using (public.is_admin());

create policy "team_members_delete"
  on public.team_members for delete
  using (public.is_admin());
