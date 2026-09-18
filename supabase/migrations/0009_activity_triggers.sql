-- ============================================================================
-- 0009 — Automatic activity-timeline logging for key entities/status changes
-- ============================================================================

-- tg_argv[0] = entity_type label, tg_argv[1] = name of the status-like column
-- to watch (defaults to 'status' when omitted), so this one function serves
-- every entity regardless of its status column name (e.g. opportunities use
-- 'stage' instead of 'status').
create or replace function log_status_change_activity()
returns trigger language plpgsql as $$
declare
  ent_type text := tg_argv[0];
  status_col text := coalesce(nullif(tg_argv[1], ''), 'status');
  old_val text;
  new_val text;
begin
  new_val := (to_jsonb(new) ->> status_col);
  if tg_op = 'INSERT' then
    insert into activities(org_id, entity_type, entity_id, type, summary, new_value, actor_id)
    values (new.org_id, ent_type, new.id, 'created', ent_type || ' created', to_jsonb(new_val), auth.uid());
  elsif tg_op = 'UPDATE' then
    old_val := (to_jsonb(old) ->> status_col);
    if new_val is distinct from old_val then
      insert into activities(org_id, entity_type, entity_id, type, summary, previous_value, new_value, actor_id)
      values (
        new.org_id, ent_type, new.id, 'status_changed',
        ent_type || ' status changed from ' || old_val || ' to ' || new_val,
        to_jsonb(old_val), to_jsonb(new_val), auth.uid()
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_activity_leads after insert or update on leads
  for each row execute function log_status_change_activity('lead');
create trigger trg_activity_candidates after insert or update on candidates
  for each row execute function log_status_change_activity('candidate');
create trigger trg_activity_opportunities after insert or update on opportunities
  for each row execute function log_status_change_activity('opportunity', 'stage');
create trigger trg_activity_jobs after insert or update on jobs
  for each row execute function log_status_change_activity('job');
create trigger trg_activity_submissions after insert or update on submissions
  for each row execute function log_status_change_activity('submission');
create trigger trg_activity_offers after insert or update on offers
  for each row execute function log_status_change_activity('offer');
create trigger trg_activity_background_checks after insert or update on background_checks
  for each row execute function log_status_change_activity('background_check');
create trigger trg_activity_placements after insert or update on placements
  for each row execute function log_status_change_activity('placement');

-- Interview scheduling -> notification for the recruiter/creator
create or replace function notify_on_interview_scheduled()
returns trigger language plpgsql as $$
declare
  cand_recruiter uuid;
begin
  select recruiter_owner_id into cand_recruiter from candidates where id = new.candidate_id;
  if cand_recruiter is not null then
    insert into notifications(org_id, user_id, type, title, body, entity_type, entity_id)
    values (
      new.org_id, cand_recruiter, 'interview_scheduled',
      'Interview scheduled',
      'An interview was scheduled for ' || new.scheduled_at::text,
      'interview', new.id
    );
  end if;
  insert into activities(org_id, entity_type, entity_id, type, summary, actor_id)
  values (new.org_id, 'candidate', new.candidate_id, 'interview_scheduled',
          'Interview scheduled (round ' || new.round || ')', auth.uid());
  return new;
end;
$$;
create trigger trg_notify_interview_scheduled after insert on interviews
  for each row execute function notify_on_interview_scheduled();

-- Task overdue notification helper (invoked by a scheduled job / edge function,
-- exposed here as a callable function since pg_cron may not be enabled on all plans)
create or replace function create_overdue_task_notifications()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(org_id, user_id, type, title, body, entity_type, entity_id)
  select t.org_id, t.assignee_id, 'task_overdue', 'Task overdue: ' || t.title,
         'Was due on ' || t.due_date::text, 'task', t.id
  from tasks t
  where t.due_date < current_date
    and t.status not in ('done')
    and t.assignee_id is not null
    and not exists (
      select 1 from notifications n
      where n.entity_type = 'task' and n.entity_id = t.id and n.type = 'task_overdue'
        and n.created_at::date = current_date
    );
end;
$$;
