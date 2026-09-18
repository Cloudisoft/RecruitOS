import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { submissionHooks, candidateHooks, jobHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { AlertTriangle } from 'lucide-react'
import type { Submission } from '../../lib/domain'

const statuses = ['submitted', 'resume_requested', 'client_reviewing', 'shortlisted', 'rejected', 'interview', 'offer', 'withdrawn', 'placed']

export function SubmissionForm({
  open, onClose, submission, defaultCandidateId, defaultJobId,
}: {
  open: boolean
  onClose: () => void
  submission?: Submission | null
  defaultCandidateId?: string
  defaultJobId?: string
}) {
  const { profile } = useAuth()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title,company_id')
  const create = submissionHooks.useCreate()
  const update = submissionHooks.useUpdate()
  const [form, setForm] = useState<Partial<Submission>>({})
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  useEffect(() => {
    setForm(
      submission ?? {
        candidate_id: defaultCandidateId ?? '', job_id: defaultJobId ?? '', status: 'submitted',
        submission_date: new Date().toISOString(),
      }
    )
  }, [submission, open, defaultCandidateId, defaultJobId])

  useEffect(() => {
    async function checkDuplicate() {
      if (!form.candidate_id || !form.job_id || submission) {
        setDuplicateWarning(false)
        return
      }
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('candidate_id', form.candidate_id)
        .eq('job_id', form.job_id)
        .not('status', 'in', '(withdrawn,rejected)')
      setDuplicateWarning((data?.length ?? 0) > 0)
    }
    checkDuplicate()
  }, [form.candidate_id, form.job_id, submission])

  function set<K extends keyof Submission>(key: K, value: Submission[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const selectedJob = jobs?.find((j: any) => j.id === form.job_id)

  async function submit() {
    if (!form.candidate_id || !form.job_id) return
    if (submission) {
      await update.mutateAsync({ id: submission.id, ...form } as any)
    } else {
      await create.mutateAsync({
        ...form,
        org_id: profile?.org_id,
        company_id: (selectedJob as any)?.company_id ?? null,
        submitted_by: profile?.id,
      } as any)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={submission ? 'Edit Submission' : 'New Submission'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.candidate_id || !form.job_id}>{submission ? 'Save changes' : 'Create submission'}</Button>
      </>
    }>
      {duplicateWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This candidate already has an active submission for this job. Submitting again may create a duplicate.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Select label="Candidate" required disabled={!!submission || !!defaultCandidateId} value={form.candidate_id ?? ''} onChange={(e) => set('candidate_id', e.target.value)}>
          <option value="">Select candidate</option>
          {candidates?.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </Select>
        <Select label="Job" required disabled={!!submission || !!defaultJobId} value={form.job_id ?? ''} onChange={(e) => set('job_id', e.target.value)}>
          <option value="">Select job</option>
          {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <Input label="Bill rate ($/hr)" type="number" value={form.bill_rate ?? ''} onChange={(e) => set('bill_rate', Number(e.target.value))} />
        <Input label="Pay rate ($/hr)" type="number" value={form.pay_rate ?? ''} onChange={(e) => set('pay_rate', Number(e.target.value))} />
        <Input label="Expected rate ($/hr)" type="number" value={form.expected_rate ?? ''} onChange={(e) => set('expected_rate', Number(e.target.value))} />
        <Select label="Status" value={form.status ?? 'submitted'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Follow-up date" type="date" value={form.follow_up_at?.slice(0, 10) ?? ''} onChange={(e) => set('follow_up_at', e.target.value)} />
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
