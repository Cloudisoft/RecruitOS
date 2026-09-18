import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { offerHooks, candidateHooks, jobHooks, submissionHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import type { Offer } from '../../lib/domain'

const statuses = ['draft', 'presented', 'accepted', 'declined', 'withdrawn']
const employmentTypes = ['w2', 'c2c', '1099', 'fulltime', 'contract_to_hire']

export function OfferForm({ open, onClose, offer, defaultCandidateId }: { open: boolean; onClose: () => void; offer?: Offer | null; defaultCandidateId?: string }) {
  const { profile } = useAuth()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title,company_id')
  const { data: submissions } = submissionHooks.useList('id,candidate_id,job_id')
  const create = offerHooks.useCreate()
  const update = offerHooks.useUpdate()
  const [form, setForm] = useState<Partial<Offer>>({})

  useEffect(() => {
    setForm(offer ?? { candidate_id: defaultCandidateId ?? '', status: 'draft', employment_type: 'c2c', offer_date: new Date().toISOString().slice(0, 10) })
  }, [offer, open, defaultCandidateId])

  function set<K extends keyof Offer>(key: K, value: Offer[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const relevantJob = jobs?.find((j: any) => j.id === form.job_id)

  async function submit() {
    if (!form.candidate_id) return
    if (offer) await update.mutateAsync({ id: offer.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, company_id: (relevantJob as any)?.company_id ?? null, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={offer ? 'Edit Offer' : 'New Offer'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.candidate_id}>{offer ? 'Save changes' : 'Create offer'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Candidate" required disabled={!!defaultCandidateId} value={form.candidate_id ?? ''} onChange={(e) => set('candidate_id', e.target.value)}>
          <option value="">Select candidate</option>
          {candidates?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Job" value={form.job_id ?? ''} onChange={(e) => set('job_id', e.target.value || null)}>
          <option value="">None</option>
          {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <Select label="Related submission" value={form.submission_id ?? ''} onChange={(e) => set('submission_id', e.target.value || null)}>
          <option value="">None</option>
          {submissions?.filter((s: any) => !form.candidate_id || s.candidate_id === form.candidate_id).map((s: any) => (
            <option key={s.id} value={s.id}>Submission {s.id.slice(0, 8)}</option>
          ))}
        </Select>
        <Input label="Position" value={form.position ?? ''} onChange={(e) => set('position', e.target.value)} />
        <Input label="Rate ($/hr)" type="number" value={form.rate ?? ''} onChange={(e) => set('rate', Number(e.target.value))} />
        <Select label="Employment type" value={form.employment_type ?? 'c2c'} onChange={(e) => set('employment_type', e.target.value as any)}>
          {employmentTypes.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </Select>
        <Input label="Offer date" type="date" value={form.offer_date ?? ''} onChange={(e) => set('offer_date', e.target.value)} />
        <Input label="Start date" type="date" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)} />
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Input label="Manager" value={form.manager ?? ''} onChange={(e) => set('manager', e.target.value)} />
        <Select label="Status" value={form.status ?? 'draft'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      {form.status === 'accepted' && (
        <p className="mt-4 rounded-lg border border-green-600/30 bg-green-500/10 p-3 text-sm text-green-300">
          Accepting this offer automatically creates a Background Check record and moves the candidate to "Background Check" status.
        </p>
      )}
    </Modal>
  )
}
