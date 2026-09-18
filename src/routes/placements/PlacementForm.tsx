import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { placementHooks, candidateHooks, jobHooks, offerHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Placement } from '../../lib/domain'

const statuses = ['pending_start', 'active', 'completed', 'terminated']
const contractTypes = ['w2', 'c2c', '1099', 'fulltime', 'contract_to_hire']

export function PlacementForm({ open, onClose, placement, defaultCandidateId }: { open: boolean; onClose: () => void; placement?: Placement | null; defaultCandidateId?: string }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title,company_id')
  const { data: offers } = offerHooks.useList('id,candidate_id,position')
  const create = placementHooks.useCreate()
  const update = placementHooks.useUpdate()
  const [form, setForm] = useState<Partial<Placement>>({})

  useEffect(() => {
    setForm(
      placement ?? {
        candidate_id: defaultCandidateId ?? '', status: 'pending_start', contract_type: 'c2c',
        pay_rate: 0, bill_rate: 0, placement_date: new Date().toISOString().slice(0, 10),
        recruiter_id: profile?.id ?? null,
      }
    )
  }, [placement, open, defaultCandidateId, profile?.id])

  function set<K extends keyof Placement>(key: K, value: Placement[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const relevantJob = jobs?.find((j: any) => j.id === form.job_id)
  const margin = (form.bill_rate ?? 0) - (form.pay_rate ?? 0)

  async function submit() {
    if (!form.candidate_id) return
    // margin is a generated/stored column in Postgres — never send it.
    const { margin: _margin, ...payload } = form
    if (placement) await update.mutateAsync({ id: placement.id, ...payload } as any)
    else await create.mutateAsync({ ...payload, org_id: profile?.org_id, company_id: (relevantJob as any)?.company_id ?? null, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={placement ? 'Edit Placement' : 'New Placement'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.candidate_id}>{placement ? 'Save changes' : 'Create placement'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Candidate" required disabled={!!defaultCandidateId || !!placement} value={form.candidate_id ?? ''} onChange={(e) => set('candidate_id', e.target.value)}>
          <option value="">Select candidate</option>
          {candidates?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Job" value={form.job_id ?? ''} onChange={(e) => set('job_id', e.target.value || null)}>
          <option value="">None</option>
          {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <Select label="Related offer" value={form.offer_id ?? ''} onChange={(e) => set('offer_id', e.target.value || null)}>
          <option value="">None</option>
          {offers?.filter((o: any) => !form.candidate_id || o.candidate_id === form.candidate_id).map((o: any) => (
            <option key={o.id} value={o.id}>{o.position || o.id.slice(0, 8)}</option>
          ))}
        </Select>
        <Input label="Position" value={form.position ?? ''} onChange={(e) => set('position', e.target.value)} />
        <Input label="Placement date" type="date" value={form.placement_date ?? ''} onChange={(e) => set('placement_date', e.target.value)} />
        <Input label="Start date" type="date" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)} />
        <Input label="Pay rate ($/hr)" type="number" required value={form.pay_rate ?? 0} onChange={(e) => set('pay_rate', Number(e.target.value))} />
        <Input label="Bill rate ($/hr)" type="number" required value={form.bill_rate ?? 0} onChange={(e) => set('bill_rate', Number(e.target.value))} />
        <Select label="Contract type" value={form.contract_type ?? 'c2c'} onChange={(e) => set('contract_type', e.target.value as any)}>
          {contractTypes.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </Select>
        <Select label="Status" value={form.status ?? 'pending_start'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Recruiter" value={form.recruiter_id ?? ''} onChange={(e) => set('recruiter_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Select label="Sales owner" value={form.sales_owner_id ?? ''} onChange={(e) => set('sales_owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <Input label="Guarantee period (days)" type="number" value={form.guarantee_period_days ?? ''} onChange={(e) => set('guarantee_period_days', Number(e.target.value))} />
        <div className="flex items-end pb-2 text-sm text-gray-600">Margin: <span className="ml-1 font-semibold text-green-600">${margin.toFixed(2)}/hr</span></div>
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
      {!placement && (
        <p className="mt-4 rounded-lg border border-green-600/30 bg-green-500/10 p-3 text-sm text-green-700">
          Creating this placement automatically sets the candidate's status to "Placed".
        </p>
      )}
    </Modal>
  )
}
