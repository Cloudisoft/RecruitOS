import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { leadHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Lead } from '../../lib/domain'

const sources = ['linkedin', 'referral', 'website', 'email', 'cold_call', 'job_board', 'existing_client', 'vendor', 'other']
const statuses = ['new', 'contacted', 'qualified', 'nurturing', 'sales_opportunity', 'converted', 'lost', 'closed']
const priorities = ['low', 'medium', 'high', 'critical']

export function LeadForm({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: Lead | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const create = leadHooks.useCreate()
  const update = leadHooks.useUpdate()
  const [form, setForm] = useState<Partial<Lead>>({})

  useEffect(() => {
    setForm(
      lead ?? {
        first_name: '', last_name: '', company: '', job_title: '', email: '', phone: '',
        source: 'other', status: 'new', priority: 'medium', owner_id: profile?.id ?? null,
      }
    )
  }, [lead, open, profile?.id])

  function set<K extends keyof Lead>(key: K, value: Lead[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.first_name || !form.last_name) return
    if (lead) {
      await update.mutateAsync({ id: lead.id, ...form } as any)
    } else {
      await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Edit Lead' : 'New Lead'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{lead ? 'Save changes' : 'Create lead'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Last name" required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
        <Input label="Company" value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} />
        <Input label="Job title" value={form.job_title ?? ''} onChange={(e) => set('job_title', e.target.value)} />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        <Input label="Phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        <Input label="LinkedIn URL" value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} />
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Select label="Source" value={form.source ?? 'other'} onChange={(e) => set('source', e.target.value as any)}>
          {sources.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Status" value={form.status ?? 'new'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Priority" value={form.priority ?? 'medium'} onChange={(e) => set('priority', e.target.value as any)}>
          {priorities.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select label="Owner" value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Input label="Industry" value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)} />
        <Input label="Technology" value={form.technology ?? ''} onChange={(e) => set('technology', e.target.value)} />
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
