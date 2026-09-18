-- ============================================================================
-- 0007 — Invoices, Revenue, Email templates/logs, Automations
-- ============================================================================

create type invoice_status as enum ('draft','sent','paid','overdue','void');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  placement_id uuid references placements(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  invoice_number text not null,
  amount numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  paid_date date,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, invoice_number)
);
create index idx_invoices_org on invoices(org_id);
create index idx_invoices_placement on invoices(placement_id);
create trigger trg_invoices_updated_at before update on invoices for each row execute function set_updated_at();

create table revenue_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  placement_id uuid references placements(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  candidate_id uuid references candidates(id) on delete set null,
  recruiter_id uuid references users(id) on delete set null,
  sales_owner_id uuid references users(id) on delete set null,
  period_month date not null, -- first of month
  bill_amount numeric(12,2) not null default 0,
  pay_amount numeric(12,2) not null default 0,
  margin_amount numeric(12,2) generated always as (bill_amount - pay_amount) stored,
  created_at timestamptz not null default now()
);
create index idx_revenue_org_month on revenue_records(org_id, period_month);
create index idx_revenue_placement on revenue_records(placement_id);

-- ---------------------------------------------------------------------------
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text not null default 'other', -- candidate_marketing, resume_submission, interview_confirmation, ...
  subject text not null,
  body_html text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_email_templates_org on email_templates(org_id);
create trigger trg_email_templates_updated_at before update on email_templates for each row execute function set_updated_at();

alter table marketing_campaigns
  add constraint fk_campaigns_email_template foreign key (email_template_id) references email_templates(id) on delete set null;

create type email_status as enum ('queued','sent','failed','not_configured');

create table email_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  template_id uuid references email_templates(id) on delete set null,
  to_addresses text[] not null,
  subject text not null,
  body_html text,
  related_entity_type text,
  related_entity_id uuid,
  status email_status not null default 'not_configured',
  error_message text,
  sent_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_email_logs_org on email_logs(org_id, created_at desc);
create index idx_email_logs_related on email_logs(related_entity_type, related_entity_id);

-- ---------------------------------------------------------------------------
create table automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_entity text not null,  -- e.g. 'candidate', 'submission', 'offer'
  trigger_event text not null,   -- e.g. 'status_changed'
  trigger_condition jsonb not null default '{}'::jsonb, -- e.g. {"to_status": "ready_to_market"}
  is_active boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_automations_org on automations(org_id);
create trigger trg_automations_updated_at before update on automations for each row execute function set_updated_at();

create table automation_actions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  action_type text not null, -- 'create_task','set_field','create_record','send_notification'
  action_params jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_automation_actions_automation on automation_actions(automation_id);
