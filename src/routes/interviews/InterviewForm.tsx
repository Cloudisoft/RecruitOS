import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { interviewHooks, candidateHooks, jobHooks, contactHooks, submissionHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import type { Interview } from '../../lib/domain'

const types = ['phone', 'video', 'technical', 'hr', 'client', 'final', 'other']
const statuses = ['scheduled', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show']

export function InterviewForm({
  open, onClose, interview, defaultCandidateId, defaultJobId, defaultSubmissionId,
}: {
  open: boolean; onClose: () => void; interview?: Interview | null
  defaultCandidateId?: string; defaultJobId?: string; defaultSubmissionId?: string
}) {
  const { profile } = useAuth()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title,company_id')
  const { data: contacts } = contactHooks.useList('id,first_name,last_name')
  const { data: submissions } = submissionHooks.useList('id,candidate_id,job_id')
  const create = interviewHooks.useCreate()
  const update = interviewHooks.useUpdate()
  const [form, setForm] = useState<Partial<Interview>>({})

  useEffect(() => {
    setForm(
      interview ?? {
        candidate_id: defaultCandidateId ?? '', job_id: defaultJobId ?? '', submission_id: defaultSubmissionId ?? null,
        interview_type: 'video', status: 'scheduled', round: 1, timezone: 'America/New_York',
        scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
      }
    )
  }, [interview, open, defaultCandidateId, defaultJobId, defaultSubmissionId])

  function set<K extends keyof Interview>(key: K, value: Interview[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const relevantJob = jobs?.find((j: any) => j.id === form.job_id)

  async function submit() {
    if (!form.candidate_id || !form.scheduled_at) return
    const payload = { ...form, scheduled_at: new Date(form.scheduled_at as string).toISOString() }
    if (interview) await update.mutateAsync({ id: interview.id, ...payload } as any)
    else await create.mutateAsync({ ...payload, org_id: profile?.org_id, company_id: (relevantJob as any)?.company_id ?? null, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={interview ? 'Edit Interview' : 'Schedule Interview'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.candidate_id || !form.scheduled_at}>{interview ? 'Save changes' : 'Schedule interview'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Candidate" required disabled={!!defaultCandidateId} value={form.candidate_id ?? ''} onChange={(e) => set('candidate_id', e.target.value)}>
          <option value="">Select candidate</option>
          {candidates?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Job" disabled={!!defaultJobId} value={form.job_id ?? ''} onChange={(e) => set('job_id', e.target.value || null)}>
          <option value="">None</option>
          {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <Select label="Related submission" value={form.submission_id ?? ''} onChange={(e) => set('submission_id', e.target.value || null)}>
          <option value="">None</option>
          {submissions?.filter((s: any) => !form.candidate_id || s.candidate_id === form.candidate_id).map((s: any) => (
            <option key={s.id} value={s.id}>Submission {s.id.slice(0, 8)}</option>
          ))}
        </Select>
        <Select label="Interviewer" value={form.interviewer_contact_id ?? ''} onChange={(e) => set('interviewer_contact_id', e.target.value || null)}>
          <option value="">None</option>
          {contacts?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Interview type" value={form.interview_type ?? 'video'} onChange={(e) => set('interview_type', e.target.value as any)}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Round" type="number" min={1} value={form.round ?? 1} onChange={(e) => set('round', Number(e.target.value))} />
        <Input label="Date & time" type="datetime-local" required value={(form.scheduled_at as string)?.slice(0, 16) ?? ''} onChange={(e) => set('scheduled_at', e.target.value)} />
        <Input label="Timezone" value={form.timezone ?? 'America/New_York'} onChange={(e) => set('timezone', e.target.value)} />
        <Input label="Meeting URL" value={form.meeting_url ?? ''} onChange={(e) => set('meeting_url', e.target.value)} />
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Select label="Status" value={form.status ?? 'scheduled'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <div className="col-span-2">
          <Textarea label="Feedback" value={form.feedback ?? ''} onChange={(e) => set('feedback', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
