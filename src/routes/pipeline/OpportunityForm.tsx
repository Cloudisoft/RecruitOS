import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { opportunityHooks, companyHooks, contactHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Opportunity } from '../../lib/domain'

const stages = [
  'new_opportunity', 'contacted', 'qualified', 'requirement_received', 'proposal_discussion',
  'active_hiring', 'submission_activity', 'interview', 'negotiation', 'closed_won', 'closed_lost',
]

export function OpportunityForm({ open, onClose, opportunity }: { open: boolean; onClose: () => void; opportunity?: Opportunity | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: contacts } = contactHooks.useList('id,first_name,last_name,company_id')
  const create = opportunityHooks.useCreate()
  const update = opportunityHooks.useUpdate()
  const [form, setForm] = useState<Partial<Opportunity>>({})

  useEffect(() => {
    setForm(opportunity ?? { name: '', stage: 'new_opportunity', probability: 10, owner_id: profile?.id ?? null })
  }, [opportunity, open, profile?.id])

  function set<K extends keyof Opportunity>(key: K, value: Opportunity[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name) return
    if (opportunity) await update.mutateAsync({ id: opportunity.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending
  const relevantContacts = contacts?.filter((c: any) => !form.company_id || c.company_id === form.company_id)

  return (
    <Modal open={open} onClose={onClose} title={opportunity ? 'Edit Opportunity' : 'New Opportunity'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{opportunity ? 'Save changes' : 'Create opportunity'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Opportunity name" required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        <Select label="Company" value={form.company_id ?? ''} onChange={(e) => set('company_id', e.target.value || null)}>
          <option value="">None</option>
          {companies?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Contact" value={form.contact_id ?? ''} onChange={(e) => set('contact_id', e.target.value || null)}>
          <option value="">None</option>
          {relevantContacts?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Input label="Estimated value ($)" type="number" value={form.estimated_value ?? 0} onChange={(e) => set('estimated_value', Number(e.target.value))} />
        <Input label="Probability (%)" type="number" min={0} max={100} value={form.probability ?? 10} onChange={(e) => set('probability', Number(e.target.value))} />
        <Select label="Stage" value={form.stage ?? 'new_opportunity'} onChange={(e) => set('stage', e.target.value as any)}>
          {stages.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Expected close date" type="date" value={form.expected_close_date ?? ''} onChange={(e) => set('expected_close_date', e.target.value)} />
        <Select label="Owner" value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
