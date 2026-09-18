# RecruitOS — Bench Sales Recruitment CRM

A CRM built specifically for US IT staffing / bench sales recruitment
companies, covering the lead → sales → bench candidate → marketing →
submission → interview → offer → background check → placement lifecycle.

This is a real, working application: every button, form, and list in the
implemented modules below reads and writes actual rows in Postgres through
Supabase, enforced by row-level security — nothing is mocked.

## Status: Phases 1–3 complete

Given the size of the full specification (a 60+ section enterprise CRM), this
build was scoped to ship a solid, fully-functional foundation first, following
the build order the spec itself prescribes, rather than a shallow pass over
every module:

**Done and fully functional:**
- **Phase 1** — Database schema (33 tables), Supabase Auth, RBAC (User /
  Admin / Global Admin) enforced via Postgres RLS (not just frontend checks),
  dark/orange app shell with the full navigation structure from the spec.
- **Phase 2** — Dashboard (live KPIs + charts from real queries), Leads (full
  CRUD, filters, lead → Contact/Company/Opportunity conversion), Contacts,
  Companies (with tabs for contacts/jobs/submissions), Sales Pipeline
  (drag-and-drop Kanban across 11 stages, persisted to DB).
- **Phase 3** — Candidates / Bench (360 view, bench aging with configurable
  thresholds, document upload/download/delete via private Supabase Storage +
  signed URLs), Jobs/Requirements, rule-based candidate-to-job matching
  ("Suggested Candidates" — skill/work-mode overlap scoring; not yet backed
  by the OpenAI-powered matching in the spec), Marketing activity logging,
  Submissions (with duplicate-submission detection, enforced at both the UI
  and DB level via a unique index), Tasks (Jira-style Kanban board),
  Settings (Organization, Team/roles, Audit Logs).

**Not yet built** (schema exists for most of these so they slot in without a
migration rewrite, but the UI/business logic isn't there yet):
- Interviews, Offers, Background Checks, Placements UI (DB tables, RLS, and
  the lifecycle triggers between them — e.g. offer accepted → background
  check auto-created → candidate placed — are already implemented and
  tested; only the screens are missing)
- Resume AI (upload/parse/analyze/enhance/generate via OpenAI), AI Copilot,
  OpenAI-backed candidate matching, Reports, Projects, Invoices/Revenue,
  Automation Builder, Email sending, Integrations, Billing

The sidebar shows every nav item from the spec; unbuilt sections are visibly
disabled with a "soon" tag rather than linking to a fake page — per the
project's own "no dead buttons, no Coming Soon pages" rule, an honestly
disabled item is preferable to a page that pretends to work.

## Tech stack

- React + TypeScript + Vite, Tailwind CSS v4
- Supabase (Postgres, Auth, Storage, RLS)
- TanStack Query for data fetching/caching
- Recharts for dashboard charts

## Getting started

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the migrations in order against your project (SQL editor, or the
   Supabase CLI):
   ```
   supabase/migrations/0001_core.sql
   supabase/migrations/0002_crm.sql
   supabase/migrations/0003_bench.sql
   supabase/migrations/0004_jobs_marketing_submissions.sql
   supabase/migrations/0005_lifecycle.sql
   supabase/migrations/0006_productivity.sql
   supabase/migrations/0007_finance_automation_email.sql
   supabase/migrations/0008_rls.sql
   supabase/migrations/0009_activity_triggers.sql
   supabase/migrations/0010_storage.sql
   ```
   Or with the CLI: `supabase link --project-ref <ref> && supabase db push`.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. `npm install && npm run dev`
5. Sign up through the app (`/signup`) — the first user in a new
   organization is automatically made Admin.
6. (Optional) Seed demo data: sign up once, grab your `org_id` from the
   `organizations` table, then run:
   ```
   psql "$DATABASE_URL" -v org_id="<your-org-id>" -f supabase/seed/seed.sql
   ```
   Seed data is for development only — nothing in the app depends on it.

All migrations and the seed script were validated end-to-end against a local
Postgres instance during development (schema, RLS policy count, the
signup → org/profile trigger, and the offer-accepted → background-check →
placement → candidate-status trigger chain were all exercised directly).

## Environment variables

See `.env.example`. `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
reserved for the Resume AI / Copilot phase (to be called from a Supabase Edge
Function, never from the frontend) and aren't used by the code in this build
yet.
