import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { candidateHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Candidate } from '../../lib/domain'

const workAuths = ['us_citizen', 'green_card', 'h1b', 'h4_ead', 'opt', 'cpt', 'tn', 'l2', 'other']
const workModes = ['remote', 'hybrid', 'onsite', 'any']
const benchStatuses = ['active_bench', 'marketing', 'interviewing', 'placed', 'not_available', 'on_hold']
const statuses = ['new', 'screening', 'ready_to_market', 'marketing', 'submitted', 'interviewing', 'offer', 'background_check', 'placed', 'on_hold', 'rejected', 'withdrawn', 'inactive']

export function CandidateForm({ open, onClose, candidate }: { open: boolean; onClose: () => void; candidate?: Candidate | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const create = candidateHooks.useCreate()
  const update = candidateHooks.useUpdate()
  const [form, setForm] = useState<Partial<Candidate>>({})

  useEffect(() => {
    setForm(
      candidate ?? {
        first_name: '', last_name: '', bench_status: 'active_bench',
        bench_start_date: new Date().toISOString().slice(0, 10),
        status: 'new', priority: 'medium', preferred_work_mode: 'any',
        recruiter_owner_id: profile?.id ?? null, secondary_skills: [], certifications: [], industry_experience: [],
      }
    )
  }, [candidate, open, profile?.id])

  function set<K extends keyof Candidate>(key: K, value: Candidate[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.first_name || !form.last_name) return
    if (candidate) await update.mutateAsync({ id: candidate.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={candidate ? 'Edit Candidate' : 'New Candidate'} size="xl" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{candidate ? 'Save changes' : 'Create candidate'}</Button>
      </>
    }>
      <div className="space-y-5">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Personal</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="First name" required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Last name" required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
            <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            <Input label="Phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
            <Select label="Work authorization" value={form.work_authorization ?? ''} onChange={(e) => set('work_authorization', e.target.value as any)}>
              <option value="">—</option>
              {workAuths.map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ').toUpperCase()}</option>)}
            </Select>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Professional</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Current title" value={form.current_title ?? ''} onChange={(e) => set('current_title', e.target.value)} />
            <Input label="Target title" value={form.target_title ?? ''} onChange={(e) => set('target_title', e.target.value)} />
            <Input label="Primary skill" value={form.primary_skill ?? ''} onChange={(e) => set('primary_skill', e.target.value)} />
            <Input label="Total experience (yrs)" type="number" step="0.5" value={form.total_experience_years ?? ''} onChange={(e) => set('total_experience_years', Number(e.target.value))} />
            <Input label="Expected rate ($/hr)" type="number" value={form.expected_rate ?? ''} onChange={(e) => set('expected_rate', Number(e.target.value))} />
            <Select label="Preferred work mode" value={form.preferred_work_mode ?? 'any'} onChange={(e) => set('preferred_work_mode', e.target.value as any)}>
              {workModes.map((w) => <option key={w} value={w}>{w}</option>)}
            </Select>
            <div className="col-span-3">
              <Input
                label="Secondary skills (comma separated)"
                value={(form.secondary_skills ?? []).join(', ')}
                onChange={(e) => set('secondary_skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bench Information</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Bench start date" type="date" value={form.bench_start_date ?? ''} onChange={(e) => set('bench_start_date', e.target.value)} />
            <Select label="Bench status" value={form.bench_status ?? 'active_bench'} onChange={(e) => set('bench_status', e.target.value as any)}>
              {benchStatuses.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
            </Select>
            <Select label="Candidate status" value={form.status ?? 'new'} onChange={(e) => set('status', e.target.value as any)}>
              {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </Select>
            <Select label="Recruiter owner" value={form.recruiter_owner_id ?? ''} onChange={(e) => set('recruiter_owner_id', e.target.value || null)}>
              <option value="">Unassigned</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </Select>
            <Select label="Priority" value={form.priority ?? 'medium'} onChange={(e) => set('priority', e.target.value as any)}>
              {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
        </section>

        <Textarea label="Education" value={form.education ?? ''} onChange={(e) => set('education', e.target.value)} />
      </div>
    </Modal>
  )
}
