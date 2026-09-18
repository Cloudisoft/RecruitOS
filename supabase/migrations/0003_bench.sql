-- ============================================================================
-- 0003_bench.sql — Candidates (core bench module) + skills/experience/
-- education/certifications/documents + resumes/resume_versions
-- ============================================================================

create type candidate_status as enum (
  'new','screening','ready_to_market','marketing','submitted','interviewing',
  'offer','background_check','placed','on_hold','rejected','withdrawn','inactive'
);
create type bench_status as enum (
  'active_bench','marketing','interviewing','placed','not_available','on_hold'
);
create type work_authorization as enum (
  'us_citizen','green_card','h1b','h4_ead','opt','cpt','tn','l2','other'
);
create type work_mode as enum ('remote','hybrid','onsite','any');

create table candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,

  -- personal
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  alternate_phone text,
  location text,
  current_city text,
  state text,
  country text default 'USA',
  work_authorization work_authorization,
  visa_type text,
  visa_expiration date,
  availability text,
  willing_to_relocate boolean default false,
  willing_to_travel boolean default false,

  -- professional
  current_title text,
  target_title text,
  primary_skill text,
  secondary_skills text[] default '{}',
  total_experience_years numeric(4,1),
  relevant_experience_years numeric(4,1),
  education text,
  certifications text[] default '{}',
  industry_experience text[] default '{}',
  preferred_location text,
  preferred_work_mode work_mode default 'any',
  expected_rate numeric(10,2),
  minimum_rate numeric(10,2),
  availability_date date,

  -- bench info
  bench_status bench_status not null default 'active_bench',
  bench_start_date date not null default current_date,
  recruiter_owner_id uuid references users(id) on delete set null,
  sales_owner_id uuid references users(id) on delete set null,
  marketing_owner_id uuid references users(id) on delete set null,
  priority lead_priority not null default 'medium',
  marketability text,
  last_marketed_at timestamptz,
  marketing_frequency text,
  status candidate_status not null default 'new',

  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_candidates_org on candidates(org_id);
create index idx_candidates_status on candidates(status);
create index idx_candidates_bench_status on candidates(bench_status);
create index idx_candidates_recruiter on candidates(recruiter_owner_id);
create index idx_candidates_email on candidates(email);
create index idx_candidates_phone on candidates(phone);
create index idx_candidates_created on candidates(created_at desc);
create index idx_candidates_skill_trgm on candidates using gin (primary_skill gin_trgm_ops);
create trigger trg_candidates_updated_at before update on candidates for each row execute function set_updated_at();

-- bench aging is always computed live (never persisted) so it never goes stale:
create or replace function candidate_bench_age_days(c candidates)
returns int language sql stable as $$
  select (current_date - c.bench_start_date);
$$;

-- ---------------------------------------------------------------------------
create table candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill text not null,
  proficiency text, -- beginner/intermediate/expert
  years_experience numeric(4,1),
  created_at timestamptz not null default now()
);
create index idx_candidate_skills_candidate on candidate_skills(candidate_id);
create index idx_candidate_skills_skill on candidate_skills(skill);

create table candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  employer text not null,
  job_title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean default false,
  description text,
  technologies text[] default '{}',
  created_at timestamptz not null default now()
);
create index idx_candidate_experience_candidate on candidate_experience(candidate_id);

create table candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  degree text not null,
  institution text not null,
  field_of_study text,
  start_year int,
  end_year int,
  created_at timestamptz not null default now()
);
create index idx_candidate_education_candidate on candidate_education(candidate_id);

create table candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  name text not null,
  issuer text,
  issued_date date,
  expiration_date date,
  created_at timestamptz not null default now()
);
create index idx_candidate_certifications_candidate on candidate_certifications(candidate_id);

-- ---------------------------------------------------------------------------
create type document_category as enum (
  'original_resume','updated_resume','passport','visa_document','work_authorization',
  'certification','degree','identification','background_check_document','offer_letter','other'
);
create type document_status as enum ('active','expired','archived');

create table candidate_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text not null,
  file_size bigint not null,
  category document_category not null default 'other',
  version int not null default 1,
  status document_status not null default 'active',
  expiration_date date,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_candidate_documents_candidate on candidate_documents(candidate_id);
create index idx_candidate_documents_org on candidate_documents(org_id);

-- ---------------------------------------------------------------------------
-- RESUMES (structured, AI-parsed data) + versioned generated/enhanced copies
-- ---------------------------------------------------------------------------
create table resumes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  source_document_id uuid references candidate_documents(id) on delete set null,
  parsed_data jsonb not null default '{}'::jsonb, -- structured AI-extracted fields
  analysis jsonb not null default '{}'::jsonb,    -- missing skills / ATS issues / gaps
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_resumes_candidate on resumes(candidate_id);
create trigger trg_resumes_updated_at before update on resumes for each row execute function set_updated_at();

create type resume_version_kind as enum ('original','enhanced','generated','tailored');
create type resume_version_status as enum ('draft','pending_approval','approved','rejected');

create table resume_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  resume_id uuid not null references resumes(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  version_number int not null,
  kind resume_version_kind not null default 'generated',
  status resume_version_status not null default 'draft',
  name text not null default 'Untitled Version',
  target_job_title text,
  target_job_description text,
  template text not null default 'classic',
  content jsonb not null default '{}'::jsonb, -- structured resume content used for rendering
  ai_score int,
  ai_suggestions jsonb default '[]'::jsonb,
  storage_path_pdf text,
  storage_path_docx text,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resume_id, version_number)
);
create index idx_resume_versions_candidate on resume_versions(candidate_id);
create index idx_resume_versions_resume on resume_versions(resume_id);
create trigger trg_resume_versions_updated_at before update on resume_versions for each row execute function set_updated_at();
