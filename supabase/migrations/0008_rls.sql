-- ============================================================================
-- 0008 — Row Level Security
--
-- Model:
--   * every org-scoped table is only visible to users of that organization
--     (or global_admin, who sees everything).
--   * plain 'user' role: full read within org, but write/delete limited to
--     records they own (owner_id / recruiter_owner_id / created_by / assignee)
--     — enforced per table below.
--   * 'admin' role: full read/write/delete within their own organization.
--   * 'global_admin' role: full read/write/delete across all organizations.
-- ============================================================================

alter table organizations enable row level security;
alter table users enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table tags enable row level security;
alter table entity_tags enable row level security;
alter table activities enable row level security;
alter table notes enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table leads enable row level security;
alter table contacts enable row level security;
alter table companies enable row level security;
alter table opportunities enable row level security;
alter table candidates enable row level security;
alter table candidate_skills enable row level security;
alter table candidate_experience enable row level security;
alter table candidate_education enable row level security;
alter table candidate_certifications enable row level security;
alter table candidate_documents enable row level security;
alter table resumes enable row level security;
alter table resume_versions enable row level security;
alter table jobs enable row level security;
alter table job_skills enable row level security;
alter table marketing_campaigns enable row level security;
alter table marketing_activities enable row level security;
alter table submissions enable row level security;
alter table submission_status_history enable row level security;
alter table interviews enable row level security;
alter table interview_feedback enable row level security;
alter table offers enable row level security;
alter table background_checks enable row level security;
alter table placements enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table task_attachments enable row level security;
alter table task_checklists enable row level security;
alter table invoices enable row level security;
alter table revenue_records enable row level security;
alter table email_templates enable row level security;
alter table email_logs enable row level security;
alter table automations enable row level security;
alter table automation_actions enable row level security;

-- ---------------------------------------------------------------------------
-- ORGANIZATIONS: members see their own org; global_admin sees all.
-- ---------------------------------------------------------------------------
create policy org_select on organizations for select
  using (id = current_org_id() or is_global_admin());
create policy org_update on organizations for update
  using (id = current_org_id() and is_admin())
  with check (id = current_org_id() and is_admin());
create policy org_insert_global_admin on organizations for insert
  with check (is_global_admin());
create policy org_delete_global_admin on organizations for delete
  using (is_global_admin());

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
create policy users_select on users for select
  using (org_id = current_org_id() or is_global_admin());
create policy users_update_self_or_admin on users for update
  using (id = auth.uid() or (org_id = current_org_id() and is_admin()) or is_global_admin())
  with check (id = auth.uid() or (org_id = current_org_id() and is_admin()) or is_global_admin());
create policy users_insert_admin on users for insert
  with check ((org_id = current_org_id() and is_admin()) or is_global_admin());
create policy users_delete_admin on users for delete
  using ((org_id = current_org_id() and is_admin()) or is_global_admin());

-- ---------------------------------------------------------------------------
-- Generic macro-style policies applied per table below.
-- Pattern:
--   select: org match (any role)
--   insert: org match (any role) — creation always allowed for org members
--   update: org match AND (is_admin() OR user owns/assigned record)
--   delete: org match AND is_admin()  (destructive ops require admin)
-- ---------------------------------------------------------------------------

-- TEAMS / TEAM_MEMBERS (admin managed)
create policy teams_select on teams for select using (org_id = current_org_id() or is_global_admin());
create policy teams_write on teams for insert with check (org_id = current_org_id() and is_admin());
create policy teams_update on teams for update using (org_id = current_org_id() and is_admin());
create policy teams_delete on teams for delete using (org_id = current_org_id() and is_admin());

create policy team_members_select on team_members for select
  using (exists (select 1 from teams t where t.id = team_id and (t.org_id = current_org_id() or is_global_admin())));
create policy team_members_write on team_members for insert
  with check (exists (select 1 from teams t where t.id = team_id and t.org_id = current_org_id() and is_admin()));
create policy team_members_delete on team_members for delete
  using (exists (select 1 from teams t where t.id = team_id and t.org_id = current_org_id() and is_admin()));

-- TAGS / ENTITY_TAGS
create policy tags_select on tags for select using (org_id = current_org_id() or is_global_admin());
create policy tags_write on tags for insert with check (org_id = current_org_id());
create policy tags_update on tags for update using (org_id = current_org_id());
create policy tags_delete on tags for delete using (org_id = current_org_id() and is_admin());
create policy entity_tags_select on entity_tags for select using (
  exists (select 1 from tags t where t.id = tag_id and (t.org_id = current_org_id() or is_global_admin()))
);
create policy entity_tags_write on entity_tags for insert with check (
  exists (select 1 from tags t where t.id = tag_id and t.org_id = current_org_id())
);
create policy entity_tags_delete on entity_tags for delete using (
  exists (select 1 from tags t where t.id = tag_id and t.org_id = current_org_id())
);

-- ACTIVITIES / NOTES (append-only-ish; org-scoped read, org-scoped insert, author/admin update-delete)
create policy activities_select on activities for select using (org_id = current_org_id() or is_global_admin());
create policy activities_insert on activities for insert with check (org_id = current_org_id());
create policy notes_select on notes for select using (org_id = current_org_id() or is_global_admin());
create policy notes_insert on notes for insert with check (org_id = current_org_id());
create policy notes_update on notes for update using (org_id = current_org_id() and (author_id = auth.uid() or is_admin()));
create policy notes_delete on notes for delete using (org_id = current_org_id() and (author_id = auth.uid() or is_admin()));

-- AUDIT LOGS: admins read org logs, global_admin reads all; insert always allowed (system writes)
create policy audit_logs_select on audit_logs for select using ((org_id = current_org_id() and is_admin()) or is_global_admin());
create policy audit_logs_insert on audit_logs for insert with check (org_id = current_org_id() or is_global_admin());

-- NOTIFICATIONS: only the recipient can see/manage their notifications
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_insert on notifications for insert with check (org_id = current_org_id() or is_global_admin());
create policy notifications_delete on notifications for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
create policy leads_select on leads for select using (org_id = current_org_id() or is_global_admin());
create policy leads_insert on leads for insert with check (org_id = current_org_id());
create policy leads_update on leads for update using (org_id = current_org_id() and (is_admin() or owner_id = auth.uid() or created_by = auth.uid()));
create policy leads_delete on leads for delete using (org_id = current_org_id() and is_admin());

-- CONTACTS
create policy contacts_select on contacts for select using (org_id = current_org_id() or is_global_admin());
create policy contacts_insert on contacts for insert with check (org_id = current_org_id());
create policy contacts_update on contacts for update using (org_id = current_org_id() and (is_admin() or owner_id = auth.uid() or created_by = auth.uid()));
create policy contacts_delete on contacts for delete using (org_id = current_org_id() and is_admin());

-- COMPANIES
create policy companies_select on companies for select using (org_id = current_org_id() or is_global_admin());
create policy companies_insert on companies for insert with check (org_id = current_org_id());
create policy companies_update on companies for update using (org_id = current_org_id() and (is_admin() or account_owner_id = auth.uid() or created_by = auth.uid()));
create policy companies_delete on companies for delete using (org_id = current_org_id() and is_admin());

-- OPPORTUNITIES
create policy opportunities_select on opportunities for select using (org_id = current_org_id() or is_global_admin());
create policy opportunities_insert on opportunities for insert with check (org_id = current_org_id());
create policy opportunities_update on opportunities for update using (org_id = current_org_id() and (is_admin() or owner_id = auth.uid() or created_by = auth.uid()));
create policy opportunities_delete on opportunities for delete using (org_id = current_org_id() and is_admin());

-- ---------------------------------------------------------------------------
-- CANDIDATES (+ child tables inherit visibility via join)
-- ---------------------------------------------------------------------------
create policy candidates_select on candidates for select using (org_id = current_org_id() or is_global_admin());
create policy candidates_insert on candidates for insert with check (org_id = current_org_id());
create policy candidates_update on candidates for update using (
  org_id = current_org_id() and (
    is_admin() or recruiter_owner_id = auth.uid() or sales_owner_id = auth.uid()
    or marketing_owner_id = auth.uid() or created_by = auth.uid()
  )
);
create policy candidates_delete on candidates for delete using (org_id = current_org_id() and is_admin());

create policy candidate_skills_all on candidate_skills for all using (
  exists (select 1 from candidates c where c.id = candidate_id and (c.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from candidates c where c.id = candidate_id and c.org_id = current_org_id())
);
create policy candidate_experience_all on candidate_experience for all using (
  exists (select 1 from candidates c where c.id = candidate_id and (c.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from candidates c where c.id = candidate_id and c.org_id = current_org_id())
);
create policy candidate_education_all on candidate_education for all using (
  exists (select 1 from candidates c where c.id = candidate_id and (c.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from candidates c where c.id = candidate_id and c.org_id = current_org_id())
);
create policy candidate_certifications_all on candidate_certifications for all using (
  exists (select 1 from candidates c where c.id = candidate_id and (c.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from candidates c where c.id = candidate_id and c.org_id = current_org_id())
);

create policy candidate_documents_select on candidate_documents for select using (org_id = current_org_id() or is_global_admin());
create policy candidate_documents_insert on candidate_documents for insert with check (org_id = current_org_id());
create policy candidate_documents_update on candidate_documents for update using (org_id = current_org_id());
create policy candidate_documents_delete on candidate_documents for delete using (org_id = current_org_id() and is_admin());

create policy resumes_select on resumes for select using (org_id = current_org_id() or is_global_admin());
create policy resumes_insert on resumes for insert with check (org_id = current_org_id());
create policy resumes_update on resumes for update using (org_id = current_org_id());
create policy resumes_delete on resumes for delete using (org_id = current_org_id() and is_admin());

create policy resume_versions_select on resume_versions for select using (org_id = current_org_id() or is_global_admin());
create policy resume_versions_insert on resume_versions for insert with check (org_id = current_org_id());
create policy resume_versions_update on resume_versions for update using (org_id = current_org_id());
create policy resume_versions_delete on resume_versions for delete using (org_id = current_org_id() and is_admin());

-- ---------------------------------------------------------------------------
-- JOBS
-- ---------------------------------------------------------------------------
create policy jobs_select on jobs for select using (org_id = current_org_id() or is_global_admin());
create policy jobs_insert on jobs for insert with check (org_id = current_org_id());
create policy jobs_update on jobs for update using (org_id = current_org_id() and (is_admin() or recruiter_id = auth.uid() or created_by = auth.uid()));
create policy jobs_delete on jobs for delete using (org_id = current_org_id() and is_admin());

create policy job_skills_all on job_skills for all using (
  exists (select 1 from jobs j where j.id = job_id and (j.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from jobs j where j.id = job_id and j.org_id = current_org_id())
);

-- MARKETING
create policy campaigns_select on marketing_campaigns for select using (org_id = current_org_id() or is_global_admin());
create policy campaigns_insert on marketing_campaigns for insert with check (org_id = current_org_id());
create policy campaigns_update on marketing_campaigns for update using (org_id = current_org_id() and (is_admin() or owner_id = auth.uid() or created_by = auth.uid()));
create policy campaigns_delete on marketing_campaigns for delete using (org_id = current_org_id() and is_admin());

create policy marketing_activities_select on marketing_activities for select using (org_id = current_org_id() or is_global_admin());
create policy marketing_activities_insert on marketing_activities for insert with check (org_id = current_org_id());
create policy marketing_activities_update on marketing_activities for update using (org_id = current_org_id() and (is_admin() or recruiter_id = auth.uid() or created_by = auth.uid()));
create policy marketing_activities_delete on marketing_activities for delete using (org_id = current_org_id() and is_admin());

-- SUBMISSIONS
create policy submissions_select on submissions for select using (org_id = current_org_id() or is_global_admin());
create policy submissions_insert on submissions for insert with check (org_id = current_org_id());
create policy submissions_update on submissions for update using (org_id = current_org_id() and (is_admin() or submitted_by = auth.uid()));
create policy submissions_delete on submissions for delete using (org_id = current_org_id() and is_admin());
create policy submission_history_select on submission_status_history for select using (
  exists (select 1 from submissions s where s.id = submission_id and (s.org_id = current_org_id() or is_global_admin()))
);
create policy submission_history_insert on submission_status_history for insert with check (true);

-- INTERVIEWS
create policy interviews_select on interviews for select using (org_id = current_org_id() or is_global_admin());
create policy interviews_insert on interviews for insert with check (org_id = current_org_id());
create policy interviews_update on interviews for update using (org_id = current_org_id());
create policy interviews_delete on interviews for delete using (org_id = current_org_id() and is_admin());
create policy interview_feedback_all on interview_feedback for all using (
  exists (select 1 from interviews i where i.id = interview_id and (i.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from interviews i where i.id = interview_id and i.org_id = current_org_id())
);

-- OFFERS
create policy offers_select on offers for select using (org_id = current_org_id() or is_global_admin());
create policy offers_insert on offers for insert with check (org_id = current_org_id());
create policy offers_update on offers for update using (org_id = current_org_id() and is_admin());
create policy offers_delete on offers for delete using (org_id = current_org_id() and is_admin());

-- BACKGROUND CHECKS
create policy bgchecks_select on background_checks for select using (org_id = current_org_id() or is_global_admin());
create policy bgchecks_insert on background_checks for insert with check (org_id = current_org_id());
create policy bgchecks_update on background_checks for update using (org_id = current_org_id());
create policy bgchecks_delete on background_checks for delete using (org_id = current_org_id() and is_admin());

-- PLACEMENTS
create policy placements_select on placements for select using (org_id = current_org_id() or is_global_admin());
create policy placements_insert on placements for insert with check (org_id = current_org_id() and is_admin());
create policy placements_update on placements for update using (org_id = current_org_id() and is_admin());
create policy placements_delete on placements for delete using (org_id = current_org_id() and is_admin());

-- PROJECTS / TASKS
create policy projects_select on projects for select using (org_id = current_org_id() or is_global_admin());
create policy projects_insert on projects for insert with check (org_id = current_org_id());
create policy projects_update on projects for update using (org_id = current_org_id() and (is_admin() or owner_id = auth.uid()));
create policy projects_delete on projects for delete using (org_id = current_org_id() and is_admin());
create policy project_members_all on project_members for all using (
  exists (select 1 from projects p where p.id = project_id and (p.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from projects p where p.id = project_id and p.org_id = current_org_id())
);

create policy tasks_select on tasks for select using (org_id = current_org_id() or is_global_admin());
create policy tasks_insert on tasks for insert with check (org_id = current_org_id());
create policy tasks_update on tasks for update using (org_id = current_org_id() and (is_admin() or assignee_id = auth.uid() or reporter_id = auth.uid()));
create policy tasks_delete on tasks for delete using (org_id = current_org_id() and (is_admin() or reporter_id = auth.uid()));

create policy task_comments_all on task_comments for all using (
  exists (select 1 from tasks t where t.id = task_id and (t.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from tasks t where t.id = task_id and t.org_id = current_org_id())
);
create policy task_attachments_all on task_attachments for all using (
  exists (select 1 from tasks t where t.id = task_id and (t.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from tasks t where t.id = task_id and t.org_id = current_org_id())
);
create policy task_checklists_all on task_checklists for all using (
  exists (select 1 from tasks t where t.id = task_id and (t.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from tasks t where t.id = task_id and t.org_id = current_org_id())
);

-- FINANCE (admin-managed)
create policy invoices_select on invoices for select using (org_id = current_org_id() or is_global_admin());
create policy invoices_write on invoices for insert with check (org_id = current_org_id() and is_admin());
create policy invoices_update on invoices for update using (org_id = current_org_id() and is_admin());
create policy invoices_delete on invoices for delete using (org_id = current_org_id() and is_admin());

create policy revenue_select on revenue_records for select using (org_id = current_org_id() or is_global_admin());
create policy revenue_write on revenue_records for insert with check (org_id = current_org_id() and is_admin());

-- EMAIL
create policy email_templates_select on email_templates for select using (org_id = current_org_id() or is_global_admin());
create policy email_templates_write on email_templates for insert with check (org_id = current_org_id());
create policy email_templates_update on email_templates for update using (org_id = current_org_id() and is_admin());
create policy email_templates_delete on email_templates for delete using (org_id = current_org_id() and is_admin());

create policy email_logs_select on email_logs for select using (org_id = current_org_id() or is_global_admin());
create policy email_logs_insert on email_logs for insert with check (org_id = current_org_id());

-- AUTOMATIONS (admin-managed)
create policy automations_select on automations for select using (org_id = current_org_id() or is_global_admin());
create policy automations_write on automations for insert with check (org_id = current_org_id() and is_admin());
create policy automations_update on automations for update using (org_id = current_org_id() and is_admin());
create policy automations_delete on automations for delete using (org_id = current_org_id() and is_admin());
create policy automation_actions_all on automation_actions for all using (
  exists (select 1 from automations a where a.id = automation_id and (a.org_id = current_org_id() or is_global_admin()))
) with check (
  exists (select 1 from automations a where a.id = automation_id and a.org_id = current_org_id() and is_admin())
);
