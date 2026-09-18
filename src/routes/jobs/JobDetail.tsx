import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { jobHooks, companyHooks, candidateHooks } from '../../lib/entities'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { EntityTimeline } from '../../components/EntityTimeline'
import { JobForm } from './JobForm'
import { SubmissionForm } from '../submissions/SubmissionForm'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { computeMatches } from '../../lib/matching'
import { Pencil, SendHorizonal } from 'lucide-react'

export function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: job, isLoading, error, refetch } = jobHooks.useOne(id)
  const { data: companies } = companyHooks.useList('id,name')
  const { data: users } = useOrgUsers()
  const { data: candidates } = candidateHooks.useList()
  const [editOpen, setEditOpen] = useState(false)
  const [submitCandidateId, setSubmitCandidateId] = useState<string | null>(null)

  const submissionsQ = useQuery({
    queryKey: ['job-submissions', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('job_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const suggestions = useMemo(() => (job && candidates ? computeMatches(job, candidates) : []), [job, candidates])

  if (isLoading) return <LoadingState />
  if (error || !job) return <ErrorState message={(error as Error)?.message ?? 'Job not found'} onRetry={refetch} />

  const companyName = companies?.find((c) => c.id === job.company_id)?.name ?? '—'

  return (
    <div>
      <PageHeader
        title={job.title}
        description={companyName}
        actions={<Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
      />

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Tabs
            tabs={[
              {
                label: 'Overview',
                content: (
                  <Card>
                    <CardBody className="space-y-4 text-sm">
                      <div>
                        <p className="mb-1 text-gray-500">Description</p>
                        <p className="whitespace-pre-wrap text-gray-700">{job.description || 'No description provided.'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-gray-500">Required skills</p>
                        <div className="flex flex-wrap gap-1.5">{job.required_skills.map((s) => <Badge key={s} color="orange">{s}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="mb-1 text-gray-500">Preferred skills</p>
                        <div className="flex flex-wrap gap-1.5">{job.preferred_skills.map((s) => <Badge key={s} color="gray">{s}</Badge>) || '—'}</div>
                      </div>
                    </CardBody>
                  </Card>
                ),
              },
              {
                label: `Suggested Candidates (${suggestions.length})`,
                content: suggestions.length === 0
                  ? <EmptyState title="No bench candidates match yet" description="Matching compares required skills, work mode, and availability against your active bench." />
                  : (
                    <div className="space-y-2">
                      {suggestions.map(({ candidate: c, score, matched, missing }) => (
                        <div key={c.id} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                          <div className="flex items-center justify-between">
                            <button onClick={() => navigate(`/candidates/${c.id}`)} className="text-sm font-medium text-gray-900 hover:text-orange-600">
                              {c.first_name} {c.last_name}
                            </button>
                            <div className="flex items-center gap-2">
                              <Badge color={score >= 70 ? 'green' : score >= 40 ? 'orange' : 'gray'}>{score}% match</Badge>
                              <Button size="sm" onClick={() => setSubmitCandidateId(c.id)}><SendHorizonal className="h-3.5 w-3.5" /> Submit</Button>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            {matched.map((m) => <Badge key={m} color="green">{m}</Badge>)}
                            {missing.map((m) => <Badge key={m} color="red">missing: {m}</Badge>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
              },
              {
                label: 'Submissions',
                content: (submissionsQ.data ?? []).length === 0
                  ? <EmptyState title="No submissions yet" />
                  : (
                    <div className="space-y-2">
                      {submissionsQ.data!.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3 text-sm">
                          <span className="text-gray-800">Bill ${s.bill_rate ?? '—'} / Pay ${s.pay_rate ?? '—'}</span>
                          <StatusBadge status={s.status} kind="submission" />
                        </div>
                      ))}
                    </div>
                  ),
              },
              { label: 'Timeline', content: <EntityTimeline entityType="job" entityId={job.id} /> },
            ]}
          />
        </div>

        <Card>
          <CardHeader><h3 className="font-medium text-gray-800">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Status"><StatusBadge status={job.status} kind="job" /></Row>
            <Row label="Location">{job.location ?? '—'}</Row>
            <Row label="Work mode">{job.work_mode}</Row>
            <Row label="Employment type">{job.employment_type.toUpperCase()}</Row>
            <Row label="Rate range">{(job.rate_min || job.rate_max) ? `$${job.rate_min ?? '?'}-${job.rate_max ?? '?'}/hr` : '—'}</Row>
            <Row label="Openings">{job.openings}</Row>
            <Row label="Recruiter">{userLabel(users, job.recruiter_id)}</Row>
            <Row label="Date received">{job.date_received}</Row>
          </CardBody>
        </Card>
      </div>

      <JobForm open={editOpen} onClose={() => setEditOpen(false)} job={job} />
      {submitCandidateId && (
        <SubmissionForm
          open={!!submitCandidateId}
          onClose={() => setSubmitCandidateId(null)}
          defaultCandidateId={submitCandidateId}
          defaultJobId={job.id}
        />
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  )
}
