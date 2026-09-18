-- ============================================================================
-- 0010 — Storage buckets (private) + policies
--
-- Buckets:
--   candidate-documents  — resumes, visas, offer letters, background docs
--   task-attachments     — Jira-style task attachments
--   org-assets           — org logos (small, semi-public within org)
--
-- All buckets are private; access is via signed URLs generated server-side
-- after an RLS-equivalent ownership check, or via the policies below for
-- direct authenticated access scoped to the user's organization. Path
-- convention: <org_id>/<entity_id>/<filename> so org scoping can be enforced
-- from the path itself.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('candidate-documents', 'candidate-documents', false),
  ('task-attachments', 'task-attachments', false),
  ('org-assets', 'org-assets', false)
on conflict (id) do nothing;

create or replace function storage_path_org_id(object_name text)
returns uuid language sql immutable as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

create policy candidate_documents_storage_select on storage.objects for select
  using (bucket_id = 'candidate-documents' and (storage_path_org_id(name) = current_org_id() or is_global_admin()));
create policy candidate_documents_storage_insert on storage.objects for insert
  with check (bucket_id = 'candidate-documents' and storage_path_org_id(name) = current_org_id());
create policy candidate_documents_storage_update on storage.objects for update
  using (bucket_id = 'candidate-documents' and storage_path_org_id(name) = current_org_id());
create policy candidate_documents_storage_delete on storage.objects for delete
  using (bucket_id = 'candidate-documents' and storage_path_org_id(name) = current_org_id() and is_admin());

create policy task_attachments_storage_select on storage.objects for select
  using (bucket_id = 'task-attachments' and (storage_path_org_id(name) = current_org_id() or is_global_admin()));
create policy task_attachments_storage_insert on storage.objects for insert
  with check (bucket_id = 'task-attachments' and storage_path_org_id(name) = current_org_id());
create policy task_attachments_storage_delete on storage.objects for delete
  using (bucket_id = 'task-attachments' and storage_path_org_id(name) = current_org_id());

create policy org_assets_storage_select on storage.objects for select
  using (bucket_id = 'org-assets' and (storage_path_org_id(name) = current_org_id() or is_global_admin()));
create policy org_assets_storage_insert on storage.objects for insert
  with check (bucket_id = 'org-assets' and storage_path_org_id(name) = current_org_id() and is_admin());
create policy org_assets_storage_update on storage.objects for update
  using (bucket_id = 'org-assets' and storage_path_org_id(name) = current_org_id() and is_admin());
