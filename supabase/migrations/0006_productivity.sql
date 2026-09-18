-- ============================================================================
-- 0006 — Tasks (Jira-style), Projects
-- ============================================================================

create type task_status as enum ('backlog','to_do','in_progress','blocked','review','done');
create type task_priority as enum ('lowest','low','medium','high','critical');

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid references users(id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'active',
  priority task_priority not null default 'medium',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_org on projects(org_id);
create trigger trg_projects_updated_at before update on projects for each row execute function set_updated_at();

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references users(id) on delete set null,
  reporter_id uuid references users(id) on delete set null,
  priority task_priority not null default 'medium',
  status task_status not null default 'to_do',
  due_date date,
  start_date date,
  labels text[] default '{}',
  related_entity_type text,
  related_entity_id uuid,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_org on tasks(org_id);
create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due on tasks(due_date);
create index idx_tasks_related on tasks(related_entity_type, related_entity_id);
create trigger trg_tasks_updated_at before update on tasks for each row execute function set_updated_at();

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_task_comments_task on task_comments(task_id);

create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_task_attachments_task on task_attachments(task_id);

create table task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  item text not null,
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_task_checklists_task on task_checklists(task_id);
