# Nerdshouse Client Portal

## What this is
A client-facing change request portal for Nerdshouse Technologies LLP.
Clients submit software bugs and feature requests. The Nerdshouse team
manages and updates them. Built to look and feel like Plane.so — minimal,
clean, light background.

## Tech stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend/DB: Supabase (Postgres + Auth + Realtime)
- Email notifications: Resend
- Deployment: Vercel (frontend), Supabase cloud (backend)
- Font: Inter

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npx supabase start` — Start local Supabase

## Architecture decisions
- Use Supabase Row Level Security (RLS) so clients only see their own tickets
- Magic link auth — no passwords, clients get login link via email
- Admin users have a separate role in Supabase (is_admin: true)
- All dates/times in IST (Asia/Kolkata)

## Database tables
- clients: id, name, company, email, is_admin, created_at
- tickets: id, title, description, priority (P0/P1/P2), status
  (open/in_progress/review/done), type (Bug/Feature/Performance),
  module, client_id, created_at, updated_at
- ticket_updates: id, ticket_id, message, author_type (client/team),
  author_name, created_at

## UI design reference
- Plane.so aesthetic — sidebar nav, issue table with status/priority
  badges, detail panel
- Light background: #f9f9f8 page, #ffffff cards
- Accent color: #4a4fe0
- Status icons: ○ Open, ◑ In progress, ◕ In review, ● Done
- Priority badges: P0=red, P1=amber, P2=blue (soft tinted backgrounds)
- Type tags: Bug=red-tint, Feature=green-tint, Performance=orange-tint

## Key screens
1. Client: My requests (issue table, filterable by status)
2. Client: New request form (title, priority, type, module, description,
   file upload)
3. Client: Ticket detail (status timeline, activity/comments thread)
4. Admin: All requests (same table, all clients, status filter tabs)
5. Admin: Ticket detail (same as client + status update + reply box)
6. Analytics: Stats cards + by-status and by-module bar charts

## Notification triggers
- On ticket created: email to Nerdshouse admin team
- On status updated: email to client
- Use Resend for email delivery