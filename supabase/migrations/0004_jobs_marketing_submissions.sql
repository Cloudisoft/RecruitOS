-- ============================================================================
-- 0004 — Jobs/Requirements, Marketing (campaigns+activities), Submissions
-- ============================================================================

create type job_status as enum (
  'new','open','sourcing','submitting','interviewing','filled','closed','cancelled'
);
create type employment_type as enum ('w2','c2c','1099','fulltime','contract_to_hire');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  company_id uuid references companies(id) on delete set null,
  hiring_manager_contact_id uuid references contacts(id) on delete set null,
  recruiter_id uuid references users(id) on delete set null,
  description text,
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  experience_required text,
  location text,
  work_mode work_mode default 'any',
  rate_min numeric(10,2),
  rate_max numeric(10,2),
  employment_type employment_type default 'c2c',
  contract_duration text,
  visa_requirements text,
  priority lead_priority not null default 'medium',
  openings int not null default 1,
  status job_status not null default 'new',
  date_received date not null default current_date,
  closing_date date,
  jd_document_path text,
  opportunity_id uuid references opportunities(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_jobs_org on jobs(org_id);
create index idx_jobs_company on jobs(company_id);
create index idx_jobs_status on jobs(status);
create index idx_jobs_recruiter on jobs(recruiter_id);
create index idx_jobs_created on jobs(created_at desc);
create trigger trg_jobs_updated_at before update on jobs for each row execute function set_updated_at();

create table job_skills (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  skill text not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_job_skills_job on job_skills(job_id);
create index idx_job_skills_skill on job_skills(skill);

-- ---------------------------------------------------------------------------
create type campaign_status as enum ('draft','ready','running','paused','completed');

create table marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  candidate_id uuid not null references candidates(id) on delete cascade,
  target_market text,
  target_roles text[] default '{}',
  skills text[] default '{}',
  target_location text,
  contact_list uuid[] default '{}', -- contact ids
  resume_version_id uuid references resume_versions(id) on delete set null,
  email_template_id uuid,
  status campaign_status not null default 'draft',
  start_date date,
  owner_id uuid references users(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_campaigns_org on marketing_campaigns(org_id);
create index idx_campaigns_candidate on marketing_campaigns(candidate_id);
create index idx_campaigns_status on marketing_campaigns(status);
create trigger trg_campaigns_updated_at before update on marketing_campaigns for each row execute function set_updated_at();

create type marketing_channel as enum (
  'resume_blast','email','linkedin','vendor','client','recruiter_outreach','job_matching','follow_up'
);
create type response_type as enum (
  'interested','requirement_received','asked_for_resume','interview','not_interested','no_response','follow_up_required'
);

create table marketing_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references marketing_campaigns(id) on delete set null,
  candidate_id uuid not null references candidates(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  activity_date timestamptz not null default now(),
  channel marketing_channel not null default 'email',
  resume_sent boolean default false,
  resume_version_id uuid references resume_versions(id) on delete set null,
  job_sent text,
  response response_type,
  notes text,
  recruiter_id uuid references users(id) on delete set null,
  next_follow_up_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_marketing_activities_candidate on marketing_activities(candidate_id);
create index idx_marketing_activities_org on marketing_activities(org_id);
create index idx_marketing_activities_campaign on marketing_activities(campaign_id);

-- ---------------------------------------------------------------------------
create type submission_status as enum (
  'submitted','resume_requested','client_reviewing','shortlisted','rejected',
  'interview','offer','withdrawn','placed'
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  resume_version_id uuid references resume_versions(id) on delete set null,
  submitted_by uuid references users(id) on delete set null,
  submission_date timestamptz not null default now(),
  bill_rate numeric(10,2),
  pay_rate numeric(10,2),
  expected_rate numeric(10,2),
  status submission_status not null default 'submitted',
  notes text,
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_submissions_org on submissions(org_id);
create index idx_submissions_candidate on submissions(candidate_id);
create index idx_submissions_job on submissions(job_id);
create index idx_submissions_status on submissions(status);
create index idx_submissions_created on submissions(created_at desc);
-- soft duplicate guard: one *active* (non withdrawn/rejected) submission per candidate+job
create unique index uq_submissions_active_candidate_job
  on submissions(candidate_id, job_id)
  where status not in ('withdrawn','rejected');
create trigger trg_submissions_updated_at before update on submissions for each row execute function set_updated_at();

create table submission_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  from_status submission_status,
  to_status submission_status not null,
  changed_by uuid references users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_submission_history_submission on submission_status_history(submission_id, created_at);

create or replace function log_submission_status_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into submission_status_history(submission_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, new.submitted_by);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into submission_status_history(submission_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_submission_status_history
  after insert or update on submissions
  for each row execute function log_submission_status_change();
