import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { jobHooks, companyHooks, contactHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Job } from '../../lib/domain'

const statuses = ['new', 'open', 'sourcing', 'submitting', 'interviewing', 'filled', 'closed', 'cancelled']
const workModes = ['remote', 'hybrid', 'onsite', 'any']
const employmentTypes = ['w2', 'c2c', '1099', 'fulltime', 'contract_to_hire']

export function JobForm({ open, onClose, job }: { open: boolean; onClose: () => void; job?: Job | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: contacts } = contactHooks.useList('id,first_name,last_name,company_id')
  const create = jobHooks.useCreate()
  const update = jobHooks.useUpdate()
  const [form, setForm] = useState<Partial<Job>>({})

  useEffect(() => {
    setForm(
      job ?? {
        title: '', status: 'new', work_mode: 'any', employment_type: 'c2c', openings: 1,
        required_skills: [], preferred_skills: [], recruiter_id: profile?.id ?? null,
        date_received: new Date().toISOString().slice(0, 10),
      }
    )
  }, [job, open, profile?.id])

  function set<K extends keyof Job>(key: K, value: Job[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.title) return
    if (job) await update.mutateAsync({ id: job.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending
  const relevantContacts = contacts?.filter((c: any) => !form.company_id || c.company_id === form.company_id)

  return (
    <Modal open={open} onClose={onClose} title={job ? 'Edit Job' : 'New Job / Requirement'} size="xl" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{job ? 'Save changes' : 'Create job'}</Button>
      </>
    }>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <Input label="Job title" required value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        </div>
        <Select label="Client / Company" value={form.company_id ?? ''} onChange={(e) => set('company_id', e.target.value || null)}>
          <option value="">None</option>
          {companies?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Hiring manager" value={form.hiring_manager_contact_id ?? ''} onChange={(e) => set('hiring_manager_contact_id', e.target.value || null)}>
          <option value="">None</option>
          {relevantContacts?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Recruiter" value={form.recruiter_id ?? ''} onChange={(e) => set('recruiter_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Select label="Work mode" value={form.work_mode ?? 'any'} onChange={(e) => set('work_mode', e.target.value as any)}>
          {workModes.map((w) => <option key={w} value={w}>{w}</option>)}
        </Select>
        <Select label="Employment type" value={form.employment_type ?? 'c2c'} onChange={(e) => set('employment_type', e.target.value as any)}>
          {employmentTypes.map((w) => <option key={w} value={w}>{w.toUpperCase()}</option>)}
        </Select>
        <Input label="Rate min ($/hr)" type="number" value={form.rate_min ?? ''} onChange={(e) => set('rate_min', Number(e.target.value))} />
        <Input label="Rate max ($/hr)" type="number" value={form.rate_max ?? ''} onChange={(e) => set('rate_max', Number(e.target.value))} />
        <Input label="Openings" type="number" min={1} value={form.openings ?? 1} onChange={(e) => set('openings', Number(e.target.value))} />
        <Select label="Status" value={form.status ?? 'new'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input label="Date received" type="date" value={form.date_received ?? ''} onChange={(e) => set('date_received', e.target.value)} />
        <Input label="Closing date" type="date" value={form.closing_date ?? ''} onChange={(e) => set('closing_date', e.target.value)} />
        <div className="col-span-3">
          <Input
            label="Required skills (comma separated)"
            value={(form.required_skills ?? []).join(', ')}
            onChange={(e) => set('required_skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </div>
        <div className="col-span-3">
          <Input
            label="Preferred skills (comma separated)"
            value={(form.preferred_skills ?? []).join(', ')}
            onChange={(e) => set('preferred_skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </div>
        <div className="col-span-3">
          <Textarea label="Job description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
