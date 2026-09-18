-- ============================================================================
-- 0012 — Automation Builder execution engine
--
-- Automations are defined declaratively in `automations` /
-- `automation_actions` (via the Automation Builder UI) and executed here,
-- server-side, whenever a watched entity's status-like column changes. This
-- is the same mechanism as the built-in lifecycle triggers (0009, 0005) —
-- generalized so admins can define their own rules without a migration.
--
-- Supported action_type values (kept intentionally small and explicit
-- rather than fully dynamic SQL, to avoid injecting arbitrary column/table
-- names from admin-authored JSON):
--   create_task        params: { title, description?, assignee_id?, priority?, due_in_days? }
--   send_notification  params: { user_id, title, body? }
--   set_candidate_field params: { field: 'status'|'bench_status'|'marketing_owner_id', value }
--   set_submission_field params: { field: 'status', value }
-- ============================================================================

create or replace function run_automations(
  p_org_id uuid,
  p_trigger_entity text,
  p_trigger_event text,
  p_entity_id uuid,
  p_to_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  automation record;
  action record;
  params jsonb;
begin
  for automation in
    select * from automations
    where org_id = p_org_id
      and trigger_entity = p_trigger_entity
      and trigger_event = p_trigger_event
      and is_active = true
      and (
        trigger_condition = '{}'::jsonb
        or trigger_condition->>'to_value' is null
        or trigger_condition->>'to_value' = p_to_value
      )
  loop
    for action in
      select * from automation_actions
      where automation_id = automation.id
      order by position asc
    loop
      params := action.action_params;

      if action.action_type = 'create_task' then
        insert into tasks (org_id, title, description, assignee_id, priority, status, due_date, related_entity_type, related_entity_id)
        values (
          p_org_id,
          coalesce(params->>'title', 'Automated follow-up'),
          params->>'description',
          nullif(params->>'assignee_id', '')::uuid,
          coalesce((params->>'priority')::task_priority, 'medium'),
          'to_do',
          case when params ? 'due_in_days' then current_date + (params->>'due_in_days')::int else null end,
          p_trigger_entity,
          p_entity_id
        );

      elsif action.action_type = 'send_notification' and nullif(params->>'user_id', '') is not null then
        insert into notifications (org_id, user_id, type, title, body, entity_type, entity_id)
        values (
          p_org_id,
          (params->>'user_id')::uuid,
          'automation',
          coalesce(params->>'title', 'Automation triggered'),
          params->>'body',
          p_trigger_entity,
          p_entity_id
        );

      elsif action.action_type = 'set_candidate_field' and p_trigger_entity = 'candidate' then
        if params->>'field' = 'status' then
          update candidates set status = (params->>'value')::candidate_status where id = p_entity_id;
        elsif params->>'field' = 'bench_status' then
          update candidates set bench_status = (params->>'value')::bench_status where id = p_entity_id;
        elsif params->>'field' = 'marketing_owner_id' then
          update candidates set marketing_owner_id = nullif(params->>'value', '')::uuid where id = p_entity_id;
        end if;

      elsif action.action_type = 'set_submission_field' and p_trigger_entity = 'submission' then
        if params->>'field' = 'status' then
          update submissions set status = (params->>'value')::submission_status where id = p_entity_id;
        end if;
      end if;
    end loop;
  end loop;
end;
$$;

-- Hook run_automations into the existing generic status-change trigger so
-- every entity that already logs activities also fires matching automations.
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
    perform run_automations(new.org_id, ent_type, 'created', new.id, new_val);
  elsif tg_op = 'UPDATE' then
    old_val := (to_jsonb(old) ->> status_col);
    if new_val is distinct from old_val then
      insert into activities(org_id, entity_type, entity_id, type, summary, previous_value, new_value, actor_id)
      values (
        new.org_id, ent_type, new.id, 'status_changed',
        ent_type || ' status changed from ' || old_val || ' to ' || new_val,
        to_jsonb(old_val), to_jsonb(new_val), auth.uid()
      );
      perform run_automations(new.org_id, ent_type, 'status_changed', new.id, new_val);
    end if;
  end if;
  return new;
end;
$$;

-- Interviews don't carry a generic "status" activity trigger yet (0009 only
-- wires notify_on_interview_scheduled on insert) — add status-change
-- automation support for them too, since the spec's example ("interview
-- completed -> follow-up task") needs it.
create or replace function run_interview_automations()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform run_automations(new.org_id, 'interview', 'status_changed', new.id, new.status::text);
  end if;
  return new;
end;
$$;

create trigger trg_interview_automations
  after update on interviews
  for each row execute function run_interview_automations();
