# Nerdshouse Client Portal

## What this is
A client-facing change request portal for Nerdshouse Technologies LLP.
Clients submit software bugs and feature requests. The Nerdshouse team
manages and updates them. Built to look and feel like Plane.so — minimal,
clean, light background.

## Tech stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend/DB: Firebase (Firestore + Auth)
- Realtime: Firestore `onSnapshot` (via `lib/use-realtime.ts`)
- Email notifications: Resend
- Deployment: Vercel (frontend), Firebase project (backend)
- Font: Inter

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `firebase deploy --only firestore:rules` — Deploy Firestore rules
- `firebase deploy --only firestore:indexes` — Deploy Firestore indexes

## Architecture decisions
- **Auth**: Google Sign-In only (`signInWithPopup` + `GoogleAuthProvider`). On sign-in, the
  Google ID token is POSTed to `/api/session` which provisions the user (first-time access
  check) and creates an httpOnly `__session` cookie. Middleware verifies it server-side.
- **Database**: Firestore with denormalized documents. Tickets embed `client_name`,
  `project_name/color`, `assignee_name/initials` as flat fields to avoid join queries.
- **Realtime**: `lib/use-realtime.ts` wraps Firestore `onSnapshot`, mirroring the old
  Supabase hook API. Skips the initial snapshot to avoid duplicating server-rendered data.
- **Admin SDK**: `lib/firebase/admin.ts` initializes once via `FIREBASE_SERVICE_ACCOUNT_B64`
  (base64-encoded service account JSON). All server components and API routes use this.
- **Client SDK**: `lib/firebase/client.ts` exports `auth` and `db` for client components.
  Used by login page (sendSignInLinkToEmail), Sidebar (signOut), and realtime subscriptions.
- **Helpers**: `lib/firebase/helpers.ts` provides `getSessionUid()`, `getSessionClient()`,
  and `docTo*` converter functions for all Firestore document types.
- **Security**: `firestore.rules` enforces access control (admin sees all; clients see own).
  Custom claim `is_admin: true` is set on admin Firebase Auth users.
- **Demo mode**: Cookie-based (`demo_user=admin|client`), no Firebase calls at all.
- All dates/times in IST (Asia/Kolkata)

## Firestore collections
- `clients/{uid}` — id = Firebase Auth UID; fields: name, company, email, is_admin, status, created_at
- `tickets/{id}` — auto ID; denormalized with client_name, project_name/color, assignee_name/initials
- `ticket_updates/{id}` — auto ID; fields: ticket_id, message, author_type, author_name, created_at
- `projects/{id}` — auto ID; fields: name, client_id, color, client_name, client_company, created_at
- `team_members/{id}` — auto ID; fields: name, email, role, avatar_initials, status, created_at

## Firebase setup checklist (new project)
1. Enable **Google** sign-in: Firebase Console → Authentication → Sign-in methods → Google
2. Set support email (e.g. axit@nerdshouse.com) in the Google provider settings
3. Add authorized domains: localhost (dev) + your Vercel URL (prod)
4. Create a service account → download JSON → base64-encode → set `FIREBASE_SERVICE_ACCOUNT_B64`
5. Deploy security rules: `firebase deploy --only firestore:rules`
6. Deploy indexes: `firebase deploy --only firestore:indexes`

## Access control on first sign-in (POST /api/session)
When a Google user signs in for the first time (no `clients/{uid}` doc exists):
- Email found in `team_members` → admin access, creates `clients/{uid}` with `is_admin: true`
- Email found in `clients` (by email field) → client access, migrates old doc to `clients/{uid}`
- Neither → 403 "No account found for this email" (user stays signed out)

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

## New tables (add to schema)
- projects: id, name, client_id, color (hex), created_at
- team_members: id, name, email, role (Admin/Developer/Designer/QA),
  avatar_initials, status (active/inactive), created_at

## New screens to build
11. Admin: Clients page — card grid, active/inactive badge, projects per
    client, ticket count, "+ Project" button per card
12. Admin: Client detail page — client info, project list (add/remove),
    recent tickets scoped to that client
13. Admin: Team page — member table (name, role, email, open tickets),
    workload bar chart, remove member, invite via email
14. Admin: Add client modal — name, company, email, status
15. Admin: Add team member modal — name, email, role (sends invite email
    via Resend)
16. Admin: Add project modal — name, color picker, linked to client_id
17. Update: New request form — Project dropdown (scoped to client's
    projects, required field)
18. Update: Ticket detail — Assignee dropdown (team members), shows
    assigned member name + initials
19. Update: Issue table — add Project column with colour dot
20. Update: Sidebar admin — Projects section listing all projects with
    colour dot and ticket count

## Firestore security model
- `clients`: admin sees all; each client reads only their own doc
- `tickets`: admin sees all; client reads only where `client_id == uid`
- `ticket_updates`: admin sees all; client reads if they own the parent ticket
- `projects`: admin sees all; client reads only where `client_id == uid`
- `team_members`: admin read/write only
- Custom claim `is_admin: true` set via Admin SDK when creating admin users