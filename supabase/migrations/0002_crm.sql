-- ============================================================================
-- 0002_crm.sql — Leads, Contacts, Companies, Opportunities
-- ============================================================================

create type lead_status as enum (
  'new','contacted','qualified','nurturing','sales_opportunity','converted','lost','closed'
);
create type lead_source as enum (
  'linkedin','referral','website','email','cold_call','job_board','existing_client','vendor','other'
);
create type lead_priority as enum ('low','medium','high','critical');

create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  company text,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  website text,
  location text,
  source lead_source not null default 'other',
  lead_type text,
  industry text,
  technology text,
  notes text,
  owner_id uuid references users(id) on delete set null,
  status lead_status not null default 'new',
  priority lead_priority not null default 'medium',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  converted_contact_id uuid,
  converted_company_id uuid,
  converted_opportunity_id uuid,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_org on leads(org_id);
create index idx_leads_owner on leads(owner_id);
create index idx_leads_status on leads(status);
create index idx_leads_email on leads(email);
create index idx_leads_created on leads(created_at desc);
create trigger trg_leads_updated_at before update on leads for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
create type contact_type as enum (
  'client','hiring_manager','recruiter','vendor','msp','implementation_partner',
  'candidate_contact','reference','other'
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  title text,
  company_id uuid,
  email text,
  phone text,
  linkedin_url text,
  location text,
  contact_type contact_type not null default 'other',
  relationship text,
  owner_id uuid references users(id) on delete set null,
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contacts_org on contacts(org_id);
create index idx_contacts_company on contacts(company_id);
create index idx_contacts_owner on contacts(owner_id);
create index idx_contacts_email on contacts(email);
create trigger trg_contacts_updated_at before update on contacts for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
create type company_type as enum (
  'client','vendor','msp','staffing_company','direct_employer','partner'
);
create type company_status as enum ('active','inactive','prospect','blacklisted');

create table companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  location text,
  company_size text,
  company_type company_type not null default 'client',
  account_owner_id uuid references users(id) on delete set null,
  status company_status not null default 'prospect',
  priority lead_priority not null default 'medium',
  description text,
  notes text,
  billing_info jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_companies_org on companies(org_id);
create index idx_companies_owner on companies(account_owner_id);
create index idx_companies_status on companies(status);
create trigger trg_companies_updated_at before update on companies for each row execute function set_updated_at();

alter table contacts add constraint fk_contacts_company foreign key (company_id) references companies(id) on delete set null;
alter table leads add constraint fk_leads_converted_contact foreign key (converted_contact_id) references contacts(id) on delete set null;
alter table leads add constraint fk_leads_converted_company foreign key (converted_company_id) references companies(id) on delete set null;

-- ---------------------------------------------------------------------------
create type opportunity_stage as enum (
  'new_opportunity','contacted','qualified','requirement_received','proposal_discussion',
  'active_hiring','submission_activity','interview','negotiation','closed_won','closed_lost'
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  estimated_value numeric(14,2) default 0,
  probability int not null default 10 check (probability between 0 and 100),
  owner_id uuid references users(id) on delete set null,
  stage opportunity_stage not null default 'new_opportunity',
  expected_close_date date,
  source lead_source,
  notes text,
  lead_id uuid references leads(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_opportunities_org on opportunities(org_id);
create index idx_opportunities_stage on opportunities(stage);
create index idx_opportunities_owner on opportunities(owner_id);
create index idx_opportunities_company on opportunities(company_id);
create trigger trg_opportunities_updated_at before update on opportunities for each row execute function set_updated_at();

alter table leads add constraint fk_leads_converted_opportunity foreign key (converted_opportunity_id) references opportunities(id) on delete set null;
