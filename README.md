# RecruitOS — Bench Sales Recruitment CRM

A CRM built specifically for US IT staffing / bench sales recruitment
companies, covering the full lead → sales → bench candidate → resume →
marketing → submission → interview → offer → background check → placement →
revenue lifecycle.

This is a real, working application: every button, form, and list reads and
writes actual rows in Postgres through Supabase, enforced by row-level
security. AI and email features call a real backend and OpenAI/Resend APIs —
when those aren't configured, the UI says so plainly instead of faking a
result.

## Architecture

- **Frontend**: React + TypeScript + Vite, Tailwind CSS v4, TanStack Query,
  Recharts. Talks to Supabase directly for all CRUD (protected by RLS).
- **Backend** (`server/`): a small Express app that does the things a
  browser can't safely do — call OpenAI with a server-only API key, send
  email via Resend, and run RBAC-scoped Copilot/matching queries with the
  Supabase service-role key. It verifies the caller's Supabase session JWT
  on every request (`server/middleware/auth.ts`) and scopes all reads/writes
  to that user's organization and role, mirroring what Postgres RLS does for
  direct DB access.
- **Deployment**: one Railway service. `npm run build` builds the frontend
  (`dist/`) and compiles the server (`dist-server/`); `npm start` runs the
  compiled server, which serves the built frontend as static files *and*
  exposes `/api/*` — no separate frontend/backend deployment needed.
- **Database**: Supabase (Postgres, Auth, Storage). All schema lives in
  `supabase/migrations/`, applied in order.

## What's implemented

Every module below is fully functional — real CRUD, real RLS, real file
storage, no mock data:

**CRM**: Dashboard (live KPIs/charts), Leads (+ convert to Contact/Company/
Opportunity), Contacts, Companies, Sales Pipeline (drag-and-drop Kanban),
Candidates/Bench (360 view, bench aging, document upload via signed URLs),
Jobs/Requirements, Submissions (with duplicate-submission detection at both
UI and DB level), Interviews (list + calendar view), Offers (accepting one
auto-creates a Background Check), Background Checks, Placements (auto-sets
candidate to Placed, computes margin).

**Intelligence**: AI Copilot (chat scoped to what the signed-in user is
allowed to see — plain users only get their own records, matching RLS),
Resume AI (upload → AI parse → AI analysis → AI enhancement/generation with
mandatory recruiter approval before anything is saved — the AI is
instructed never to invent employers, dates, or skills), Candidate Matching
(deterministic skill/work-mode/availability scoring, with an optional
AI-written explanation layer), Reports (lead conversion, bench aging,
submissions, interviews, placements & margin, recruiter performance — all
filterable and CSV-exportable).

**Work**: Projects (with members and linked tasks), Tasks (Jira-style
Kanban board, linkable to any entity).

**Finance**: Invoices, Sales/Revenue (generated from active placements,
monthly chart).

**Automation**: Automation Builder — admins define "when a status changes,
then create a task / notify someone / set a field" rules in the UI; these
execute as real Postgres triggers, not client-side polling.

**Settings**: Organization, Team (role management), Email (templates +
compose/send), Integrations (live config status for Supabase/OpenAI/email),
Billing (real usage counts; no fake payment flow — architecture is modular
for adding Stripe later), Audit Logs.

## Getting started (local development)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Apply the migrations in order (Supabase SQL editor, or the CLI):
   ```
   supabase/migrations/0001_core.sql  ...  through  ...  0012_automation_executor.sql
   ```
   With the CLI: `supabase link --project-ref <ref> && supabase db push`.
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (backend, same project)
   - `OPENAI_API_KEY` (optional — Resume AI/Copilot/AI matching explain
     clearly report "not configured" without it)
   - `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` (optional — same idea for email)
4. `npm install`
5. `npm run dev` — runs the Vite dev server and the Express API together
   (concurrently), with `/api` proxied to the local API.
6. Sign up through the app (`/signup`) — the first user in a new
   organization is automatically made Admin.
7. (Optional) Seed demo data — see `supabase/seed/seed.sql` header comment
   for the exact command. Development-only; nothing in the app depends on it.

## Deploying to Railway

This repo is set up to deploy as a **single Railway service**:

1. Create a new Railway project from this repo.
2. Railway auto-detects Node via Nixpacks; `railway.json` pins the build to
   `npm ci && npm run build` and the start command to `npm run start`.
3. Set these environment variables on the Railway service (Settings →
   Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and optionally `OPENAI_API_KEY`,
   `OPENAI_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`.
   - The `VITE_*` ones are baked into the frontend bundle at **build** time,
     so they must be set before/at deploy, not just at runtime — Railway
     variables are available during the build step, so this just works.
   - Don't set `PORT` — Railway injects it, and the server reads
     `process.env.PORT` automatically.
4. Deploy. Railway will build the frontend and server in one step and run
   the compiled server, which serves both the UI and the API on the same
   URL — no CORS configuration or second service needed.
5. Visit the Railway-provided URL and sign up.

## Verification performed during development

- All 12 migrations and the seed script were run end-to-end against a local
  Postgres instance (with a minimal `auth`/`storage` schema stub standing in
  for Supabase's), including the signup→org/profile trigger, the
  offer-accepted→background-check→placement→candidate-status trigger chain,
  and a full round-trip through the Automation Builder engine (a custom
  "candidate enters Ready to Market → create task + set bench status" rule
  was defined and fired for real).
- `tsc --noEmit` is clean for both the frontend (`tsconfig.app.json`) and
  backend (`tsconfig.server.json`).
- `npm run build` (frontend + server) succeeds; the compiled server was
  started standalone and verified to serve the built frontend, handle SPA
  routes, expose `/api/health` and `/api/status`, and correctly reject
  unauthenticated requests to AI endpoints with 401.
- A headless browser smoke test against both the dev build and the compiled
  production server confirmed no console errors on load and correct
  route-guard redirects for unauthenticated users.
- Not verified: a live Supabase project (no Docker in this environment to
  run `supabase start`), so real auth/RLS/storage behavior in production
  should be spot-checked after your first deploy.

## Environment variables

See `.env.example` for the full list and comments on what each one gates.
