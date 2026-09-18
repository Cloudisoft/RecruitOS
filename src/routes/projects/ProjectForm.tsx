import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { projectHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Project } from '../../lib/domain'

const statuses = ['active', 'on_hold', 'completed', 'cancelled']
const priorities = ['lowest', 'low', 'medium', 'high', 'critical']

export function ProjectForm({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const create = projectHooks.useCreate()
  const update = projectHooks.useUpdate()
  const [form, setForm] = useState<Partial<Project>>({})

  useEffect(() => {
    setForm(project ?? { name: '', status: 'active', priority: 'medium', owner_id: profile?.id ?? null })
  }, [project, open, profile?.id])

  function set<K extends keyof Project>(key: K, value: Project[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name) return
    if (project) await update.mutateAsync({ id: project.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Edit Project' : 'New Project'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{project ? 'Save changes' : 'Create project'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Project name" required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        <Select label="Owner" value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Select label="Priority" value={form.priority ?? 'medium'} onChange={(e) => set('priority', e.target.value as any)}>
          {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Input label="Start date" type="date" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)} />
        <Input label="End date" type="date" value={form.end_date ?? ''} onChange={(e) => set('end_date', e.target.value)} />
        <Select label="Status" value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <div className="col-span-2">
          <Textarea label="Description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
