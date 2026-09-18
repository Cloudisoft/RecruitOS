-- ============================================================================
-- 0001_core.sql — Extensions, organizations, users/roles, teams, shared
-- infrastructure tables (tags, activities, notes, audit_logs, notifications)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type app_role as enum ('user', 'admin', 'global_admin');

create type org_status as enum ('active', 'suspended', 'trial', 'cancelled');

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  date_format text not null default 'MM/DD/YYYY',
  status org_status not null default 'trial',
  bench_aging_thresholds jsonb not null default '[15,30,60,90]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- USERS (profile table, 1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  phone text,
  title text,
  role app_role not null default 'user',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_users_org on users(org_id);
create index idx_users_email on users(email);

-- ---------------------------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_teams_org on teams(org_id);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- ---------------------------------------------------------------------------
-- TAGS / ENTITY_TAGS (generic tagging across entities)
-- ---------------------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null default '#f97316',
  created_at timestamptz not null default now(),
  unique(org_id, name)
);

create table entity_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  entity_type text not null, -- 'lead' | 'contact' | 'company' | 'candidate' | ...
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique(tag_id, entity_type, entity_id)
);
create index idx_entity_tags_entity on entity_tags(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- ACTIVITIES (universal timeline)
-- ---------------------------------------------------------------------------
create type activity_type as enum (
  'created','updated','deleted','note','call','email','meeting',
  'task_created','task_completed','status_changed','resume_generated',
  'resume_enhanced','resume_sent','submission_created','interview_scheduled',
  'interview_completed','offer_created','background_check','placement'
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  type activity_type not null,
  summary text not null,
  previous_value jsonb,
  new_value jsonb,
  actor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_activities_entity on activities(entity_type, entity_id, created_at desc);
create index idx_activities_org on activities(org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- NOTES (generic notes across entities)
-- ---------------------------------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  author_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notes_entity on notes(entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null, -- login, logout, create, update, delete, export, upload, ...
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_org on audit_logs(org_id, created_at desc);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS (used throughout RLS policies)
-- ---------------------------------------------------------------------------
create or replace function current_user_row()
returns users
language sql stable security definer set search_path = public as $$
  select * from users where id = auth.uid();
$$;

create or replace function current_org_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from users where id = auth.uid();
$$;

create or replace function current_app_role()
returns app_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','global_admin') from users where id = auth.uid()), false);
$$;

create or replace function is_global_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'global_admin' from users where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper (reused by every table with updated_at)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger trg_teams_updated_at before update on teams
  for each row execute function set_updated_at();
create trigger trg_notes_updated_at before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> users profile row (first user in an email domain becomes
-- global_admin only via explicit seeding; default signup creates a new org
-- owned as 'admin').
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', split_part(new.email, '@', 2));

  if new.raw_user_meta_data ? 'invited_org_id' then
    insert into users (id, org_id, email, full_name, role)
    values (
      new.id,
      (new.raw_user_meta_data->>'invited_org_id')::uuid,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce((new.raw_user_meta_data->>'role')::app_role, 'user')
    );
  else
    insert into organizations (name) values (org_name) returning id into new_org_id;
    insert into users (id, org_id, email, full_name, role)
    values (new.id, new_org_id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'admin');
  end if;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
