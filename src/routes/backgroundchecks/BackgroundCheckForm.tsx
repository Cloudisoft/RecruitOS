import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { backgroundCheckHooks, candidateHooks, offerHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import type { BackgroundCheck } from '../../lib/domain'

const types = ['identity', 'employment', 'education', 'criminal', 'reference', 'work_authorization', 'address', 'other']
const statuses = ['not_started', 'initiated', 'in_progress', 'passed', 'failed', 'needs_review', 'completed']

export function BackgroundCheckForm({ open, onClose, check, defaultCandidateId }: { open: boolean; onClose: () => void; check?: BackgroundCheck | null; defaultCandidateId?: string }) {
  const { profile } = useAuth()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: offers } = offerHooks.useList('id,candidate_id,position')
  const create = backgroundCheckHooks.useCreate()
  const update = backgroundCheckHooks.useUpdate()
  const [form, setForm] = useState<Partial<BackgroundCheck>>({})

  useEffect(() => {
    setForm(check ?? { candidate_id: defaultCandidateId ?? '', verification_type: 'employment', status: 'not_started' })
  }, [check, open, defaultCandidateId])

  function set<K extends keyof BackgroundCheck>(key: K, value: BackgroundCheck[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.candidate_id) return
    if (check) await update.mutateAsync({ id: check.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={check ? 'Edit Background Check' : 'New Background Check'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.candidate_id}>{check ? 'Save changes' : 'Create record'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Candidate" required disabled={!!defaultCandidateId} value={form.candidate_id ?? ''} onChange={(e) => set('candidate_id', e.target.value)}>
          <option value="">Select candidate</option>
          {candidates?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Related offer" value={form.offer_id ?? ''} onChange={(e) => set('offer_id', e.target.value || null)}>
          <option value="">None</option>
          {offers?.filter((o: any) => !form.candidate_id || o.candidate_id === form.candidate_id).map((o: any) => (
            <option key={o.id} value={o.id}>{o.position || o.id.slice(0, 8)}</option>
          ))}
        </Select>
        <Select label="Verification type" value={form.verification_type ?? 'employment'} onChange={(e) => set('verification_type', e.target.value as any)}>
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Provider" value={form.verification_provider ?? ''} onChange={(e) => set('verification_provider', e.target.value)} />
        <Input label="Initiated date" type="date" value={form.initiated_at ?? ''} onChange={(e) => set('initiated_at', e.target.value)} />
        <Input label="Completed date" type="date" value={form.completed_at ?? ''} onChange={(e) => set('completed_at', e.target.value)} />
        <Select label="Status" value={form.status ?? 'not_started'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Result" value={form.result ?? ''} onChange={(e) => set('result', e.target.value)} />
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
