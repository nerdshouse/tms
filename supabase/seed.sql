-- Nerdshouse Client Portal — seed data for local development
-- Run after applying migrations and creating auth users manually.
-- Replace the UUIDs below with real auth.users IDs from your local Supabase instance.

-- Sample clients (run after creating users in auth.users via Supabase dashboard or magic link)
-- These are inserted directly; the handle_new_user trigger would normally do this on signup.

insert into public.clients (id, name, company, email, is_admin) values
  ('00000000-0000-0000-0000-000000000001', 'Team Admin', 'Nerdshouse Technologies LLP', 'admin@nerdshouse.in', true),
  ('00000000-0000-0000-0000-000000000002', 'Priya Sharma',  'Acme Corp',   'priya@acme.com',     false),
  ('00000000-0000-0000-0000-000000000003', 'Rahul Verma',   'Globex Inc',  'rahul@globex.com',   false),
  ('00000000-0000-0000-0000-000000000004', 'Anika Patel',   'Initech',     'anika@initech.com',  false)
on conflict (id) do nothing;

-- Sample tickets
insert into public.tickets (id, title, description, priority, status, type, module, client_id) values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Login page throws 500 on incorrect OTP',
    'When an expired magic link is clicked, the page crashes with a 500 error instead of showing a friendly message.',
    'P0', 'in_progress', 'Bug', 'Authentication',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Add bulk export to CSV on the reports page',
    'We need the ability to export filtered results as a CSV file from the Reports module.',
    'P1', 'open', 'Feature', 'Reports',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Dashboard takes 8s to load on first visit',
    'The dashboard is very slow on first load. Likely due to N+1 queries on the summary cards.',
    'P1', 'review', 'Performance', 'Dashboard',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Billing invoice PDF is missing company logo',
    'The generated PDF invoices do not include our company logo. Please add it to the top-left corner.',
    'P2', 'open', 'Bug', 'Billing',
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Slack integration for ticket notifications',
    'Please add a Slack webhook integration so our team gets notified in Slack when a ticket status changes.',
    'P2', 'done', 'Feature', 'Integrations',
    '00000000-0000-0000-0000-000000000004'
  )
on conflict (id) do nothing;

-- Sample activity
insert into public.ticket_updates (ticket_id, message, author_type, author_name) values
  ('a0000000-0000-0000-0000-000000000001', 'We have reproduced the issue and are working on a fix. Expected by EOD.', 'team', 'Axit Mehta'),
  ('a0000000-0000-0000-0000-000000000001', 'Thank you! This is blocking our onboarding flow.', 'client', 'Priya Sharma'),
  ('a0000000-0000-0000-0000-000000000003', 'We have identified the N+1 query. Fix is in review now.', 'team', 'Axit Mehta'),
  ('a0000000-0000-0000-0000-000000000005', 'Slack integration is live. Configure the webhook in Settings > Integrations.', 'team', 'Axit Mehta');
