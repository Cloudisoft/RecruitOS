-- ============================================================================
-- Development seed data — DEMO DATA ONLY. Never required for the app to
-- function; safe to skip in production. Run manually against a dev project:
--   psql "$DATABASE_URL" -f supabase/seed/seed.sql
--
-- NOTE: this seed assumes at least one auth user already exists (sign up
-- once through the app first) so that `users`/`organizations` rows exist via
-- the handle_new_auth_user trigger. Pass that user's org_id in via psql -v,
-- e.g.:
--   psql "$DATABASE_URL" -v org_id="'00000000-0000-0000-0000-000000000000'" -f seed.sql
-- ============================================================================

select set_config('app.seed_org_id', :'org_id', false);

do $$
declare
  v_org_id uuid := current_setting('app.seed_org_id')::uuid;
  v_owner uuid;
  c1 uuid; c2 uuid; c3 uuid;
  comp1 uuid; comp2 uuid;
  contact1 uuid;
  job1 uuid;
begin
  select id into v_owner from users where org_id = v_org_id limit 1;

  insert into companies (org_id, name, website, industry, location, company_type, account_owner_id, status, created_by)
  values
    (v_org_id, 'Acme Technologies', 'https://acme-tech.example', 'Information Technology', 'Dallas, TX', 'client', v_owner, 'active', v_owner)
    returning id into comp1;
  insert into companies (org_id, name, website, industry, location, company_type, account_owner_id, status, created_by)
  values
    (v_org_id, 'Nova Staffing Partners', 'https://novastaffing.example', 'Staffing', 'Austin, TX', 'vendor', v_owner, 'active', v_owner)
    returning id into comp2;

  insert into contacts (org_id, first_name, last_name, title, company_id, email, phone, contact_type, owner_id, created_by)
  values (v_org_id, 'Sarah', 'Mitchell', 'Director of Engineering', comp1, 'sarah.mitchell@acme-tech.example', '214-555-0110', 'hiring_manager', v_owner, v_owner)
  returning id into contact1;

  insert into leads (org_id, first_name, last_name, company, job_title, email, phone, source, status, priority, owner_id, created_by)
  values
    (v_org_id, 'James', 'Carter', 'Bright Financial', 'VP Talent Acquisition', 'james.carter@brightfin.example', '512-555-0199', 'linkedin', 'new', 'high', v_owner, v_owner),
    (v_org_id, 'Elena', 'Ruiz', 'Meridian Health Systems', 'IT Director', 'elena.ruiz@meridianhealth.example', '469-555-0142', 'referral', 'contacted', 'medium', v_owner, v_owner);

  insert into opportunities (org_id, name, company_id, contact_id, estimated_value, probability, owner_id, stage, expected_close_date, created_by)
  values (v_org_id, 'Acme Java Team Expansion', comp1, contact1, 180000, 40, v_owner, 'requirement_received', current_date + 30, v_owner);

  insert into jobs (org_id, title, company_id, hiring_manager_contact_id, recruiter_id, description, required_skills, preferred_skills, location, work_mode, rate_min, rate_max, employment_type, status, created_by)
  values (v_org_id, 'Senior Java Developer', comp1, contact1, v_owner,
          'Build and maintain microservices for a high-volume trading platform.',
          array['Java','Spring Boot','Microservices','AWS'], array['Kafka','Kubernetes'],
          'Dallas, TX (Hybrid)', 'hybrid', 65, 80, 'c2c', 'open', v_owner)
  returning id into job1;

  insert into candidates (org_id, first_name, last_name, email, phone, location, current_city, state, work_authorization, current_title, target_title, primary_skill, secondary_skills, total_experience_years, bench_status, bench_start_date, recruiter_owner_id, status, created_by)
  values
    (v_org_id, 'Michael', 'Chen', 'michael.chen@example.com', '972-555-0133', 'Plano, TX', 'Plano', 'TX', 'h1b', 'Java Developer', 'Senior Java Developer', 'Java', array['Spring Boot','AWS','Docker'], 6, 'active_bench', current_date - 20, v_owner, 'ready_to_market', v_owner)
    returning id into c1;
  insert into candidates (org_id, first_name, last_name, email, phone, location, current_city, state, work_authorization, current_title, target_title, primary_skill, secondary_skills, total_experience_years, bench_status, bench_start_date, recruiter_owner_id, status, created_by)
  values
    (v_org_id, 'Priya', 'Natarajan', 'priya.n@example.com', '214-555-0177', 'Irving, TX', 'Irving', 'TX', 'green_card', 'Data Engineer', 'Senior Data Engineer', 'Python', array['Spark','Airflow','AWS'], 8, 'marketing', current_date - 45, v_owner, 'marketing', v_owner)
    returning id into c2;
  insert into candidates (org_id, first_name, last_name, email, phone, location, current_city, state, work_authorization, current_title, target_title, primary_skill, secondary_skills, total_experience_years, bench_status, bench_start_date, recruiter_owner_id, status, created_by)
  values
    (v_org_id, 'David', 'Okafor', 'david.okafor@example.com', '469-555-0188', 'Frisco, TX', 'Frisco', 'TX', 'us_citizen', '.NET Developer', 'Lead .NET Developer', 'C#', array['.NET Core','Azure','SQL Server'], 10, 'active_bench', current_date - 95, v_owner, 'new', v_owner)
    returning id into c3;

  insert into submissions (org_id, candidate_id, job_id, company_id, contact_id, submitted_by, bill_rate, pay_rate, expected_rate, status, notes)
  values (v_org_id, c1, job1, comp1, contact1, v_owner, 78, 62, 65, 'client_reviewing', 'Submitted with tailored resume v2.');

  insert into tasks (org_id, title, description, assignee_id, reporter_id, priority, status, due_date, related_entity_type, related_entity_id)
  values
    (v_org_id, 'Follow up with Acme on Michael Chen submission', 'Check status of client review', v_owner, v_owner, 'high', 'to_do', current_date + 2, 'submission', c1),
    (v_org_id, 'Refresh Priya Natarajan marketing resume', 'Update with latest Spark project', v_owner, v_owner, 'medium', 'to_do', current_date + 5, 'candidate', c2);

  raise notice 'Seed complete for org %', v_org_id;
end $$;
