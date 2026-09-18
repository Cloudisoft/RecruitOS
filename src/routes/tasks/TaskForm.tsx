import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { taskHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Task } from '../../lib/domain'

const statuses = ['backlog', 'to_do', 'in_progress', 'blocked', 'review', 'done']
const priorities = ['lowest', 'low', 'medium', 'high', 'critical']

export function TaskForm({
  open, onClose, task, defaultProjectId, defaultRelatedEntityType, defaultRelatedEntityId,
}: {
  open: boolean; onClose: () => void; task?: Task | null
  defaultProjectId?: string; defaultRelatedEntityType?: string; defaultRelatedEntityId?: string
}) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const create = taskHooks.useCreate()
  const update = taskHooks.useUpdate()
  const [form, setForm] = useState<Partial<Task>>({})
  const isEdit = !!task?.id

  useEffect(() => {
    setForm(
      task ?? {
        title: '', status: 'to_do', priority: 'medium', assignee_id: profile?.id ?? null, reporter_id: profile?.id ?? null,
        project_id: defaultProjectId ?? null,
        related_entity_type: defaultRelatedEntityType ?? null,
        related_entity_id: defaultRelatedEntityId ?? null,
      }
    )
  }, [task, open, profile?.id, defaultProjectId, defaultRelatedEntityType, defaultRelatedEntityId])

  function set<K extends keyof Task>(key: K, value: Task[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.title) return
    if (isEdit) await update.mutateAsync({ id: task!.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Create task'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Title" required value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        </div>
        <Select label="Assignee" value={form.assignee_id ?? ''} onChange={(e) => set('assignee_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Select label="Priority" value={form.priority ?? 'medium'} onChange={(e) => set('priority', e.target.value as any)}>
          {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select label="Status" value={form.status ?? 'to_do'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Due date" type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} />
        <div className="col-span-2">
          <Textarea label="Description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
