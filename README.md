# Nerdshouse Client Portal

Client-facing change request portal for Nerdshouse Technologies LLP. Clients submit bugs and feature requests; the Nerdshouse team manages and responds to them.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend / DB**: Supabase (Postgres + Auth + Realtime)
- **Email**: Resend
- **Deployment**: Vercel (frontend) + Supabase Cloud (backend)

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd req
npm install
```

### 2. Start local Supabase

```bash
npx supabase start
```

Copy the output values (`API URL`, `anon key`, `service_role key`) for the next step.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, `service_role` key (**keep secret**) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `ADMIN_EMAIL` | Email address for new-ticket notifications |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |

### 4. Apply database migrations

```bash
npx supabase db push
# or run manually in the Supabase SQL editor:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_rls_policies.sql
```

### 5. Load seed data (optional)

Open the local Supabase SQL editor at `http://localhost:54323` and run `supabase/seed.sql`.

> The seed data uses placeholder UUIDs. For a real test, create users via magic link first, then update the UUIDs in the seed file.

### 6. Run the dev server

```bash
npm run dev
```

App is at `http://localhost:3000`.

---

## Creating an Admin User

1. Sign in via magic link with the intended admin email.
2. In the Supabase dashboard (or SQL editor), run:

```sql
update public.clients set is_admin = true where email = 'your@email.com';
```

---

## Deployment

### Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations via the SQL editor or `npx supabase db push --linked`.
3. In **Authentication → Email Templates**, customise the magic link email.
4. In **Authentication → URL Configuration**, add your Vercel URL to **Redirect URLs**:
   `https://your-app.vercel.app/auth/callback`

### Vercel

1. Push the repo to GitHub.
2. Import into [vercel.com](https://vercel.com).
3. Add all environment variables from `.env.local.example` in the Vercel dashboard.
4. Deploy. Vercel auto-detects Next.js.

---

## Useful Commands

```bash
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run lint       # ESLint
npx supabase start # Start local Supabase
npx supabase stop  # Stop local Supabase
```
