-- ============================================================================
-- 0005 — Interviews, Offers, Background Checks, Placements
-- ============================================================================

create type interview_type as enum ('phone','video','technical','hr','client','final','other');
create type interview_status as enum ('scheduled','confirmed','completed','rescheduled','cancelled','no_show');

create table interviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  submission_id uuid references submissions(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  interviewer_contact_id uuid references contacts(id) on delete set null,
  interview_type interview_type not null default 'video',
  scheduled_at timestamptz not null,
  timezone text not null default 'America/New_York',
  meeting_url text,
  location text,
  round int not null default 1,
  status interview_status not null default 'scheduled',
  feedback text,
  result text,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_interviews_org on interviews(org_id);
create index idx_interviews_candidate on interviews(candidate_id);
create index idx_interviews_submission on interviews(submission_id);
create index idx_interviews_scheduled on interviews(scheduled_at);
create trigger trg_interviews_updated_at before update on interviews for each row execute function set_updated_at();

create table interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  rating int check (rating between 1 and 5),
  strengths text,
  concerns text,
  recommendation text,
  submitted_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_interview_feedback_interview on interview_feedback(interview_id);

-- ---------------------------------------------------------------------------
create type offer_status as enum ('draft','presented','accepted','declined','withdrawn');

create table offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  submission_id uuid references submissions(id) on delete set null,
  offer_date date not null default current_date,
  start_date date,
  position text,
  rate numeric(10,2),
  employment_type employment_type default 'c2c',
  contract_duration text,
  location text,
  manager text,
  status offer_status not null default 'draft',
  offer_document_path text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_offers_org on offers(org_id);
create index idx_offers_candidate on offers(candidate_id);
create index idx_offers_status on offers(status);
create trigger trg_offers_updated_at before update on offers for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
create type verification_type as enum (
  'identity','employment','education','criminal','reference','work_authorization','address','other'
);
create type background_check_status as enum (
  'not_started','initiated','in_progress','passed','failed','needs_review','completed'
);

create table background_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  offer_id uuid references offers(id) on delete set null,
  verification_provider text,
  verification_type verification_type not null default 'employment',
  initiated_at date,
  completed_at date,
  status background_check_status not null default 'not_started',
  result text,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bgchecks_org on background_checks(org_id);
create index idx_bgchecks_candidate on background_checks(candidate_id);
create index idx_bgchecks_offer on background_checks(offer_id);
create trigger trg_bgchecks_updated_at before update on background_checks for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
create type placement_status as enum ('pending_start','active','completed','terminated');

create table placements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  offer_id uuid references offers(id) on delete set null,
  submission_id uuid references submissions(id) on delete set null,
  placement_date date not null default current_date,
  start_date date,
  position text,
  recruiter_id uuid references users(id) on delete set null,
  sales_owner_id uuid references users(id) on delete set null,
  pay_rate numeric(10,2) not null default 0,
  bill_rate numeric(10,2) not null default 0,
  margin numeric(10,2) generated always as (bill_rate - pay_rate) stored,
  contract_type employment_type default 'c2c',
  status placement_status not null default 'pending_start',
  guarantee_period_days int,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_placements_org on placements(org_id);
create index idx_placements_candidate on placements(candidate_id);
create index idx_placements_company on placements(company_id);
create index idx_placements_status on placements(status);
create trigger trg_placements_updated_at before update on placements for each row execute function set_updated_at();

-- when a placement is created/completed, candidate becomes PLACED
create or replace function sync_candidate_on_placement()
returns trigger language plpgsql as $$
begin
  update candidates set status = 'placed', bench_status = 'placed'
  where id = new.candidate_id;
  return new;
end;
$$;
create trigger trg_sync_candidate_on_placement
  after insert on placements
  for each row execute function sync_candidate_on_placement();

-- when offer accepted, auto-create a background_check record (if none active)
create or replace function auto_create_background_check()
returns trigger language plpgsql as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    if not exists (select 1 from background_checks where offer_id = new.id) then
      insert into background_checks (org_id, candidate_id, company_id, offer_id, status)
      values (new.org_id, new.candidate_id, new.company_id, new.id, 'not_started');
    end if;
    update candidates set status = 'background_check' where id = new.candidate_id;
  end if;
  return new;
end;
$$;
create trigger trg_auto_create_background_check
  after update on offers
  for each row execute function auto_create_background_check();
