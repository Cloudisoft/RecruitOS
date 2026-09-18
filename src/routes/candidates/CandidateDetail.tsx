import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { candidateHooks } from '../../lib/entities'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { EntityTimeline } from '../../components/EntityTimeline'
import { CandidateDocuments } from './CandidateDocuments'
import { CandidateMarketing } from './CandidateMarketing'
import { CandidateResumeAI } from './CandidateResumeAI'
import { CandidateForm } from './CandidateForm'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { benchAgeBucket, benchAgeDays } from '../../lib/benchAging'
import { Pencil } from 'lucide-react'

export function CandidateDetail() {
  const { id } = useParams()
  const { data: candidate, isLoading, error, refetch } = candidateHooks.useOne(id)
  const { data: users } = useOrgUsers()
  const [editOpen, setEditOpen] = useState(false)

  const submissionsQ = useQuery({
    queryKey: ['candidate-submissions', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('candidate_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  if (isLoading) return <LoadingState />
  if (error || !candidate) return <ErrorState message={(error as Error)?.message ?? 'Candidate not found'} onRetry={refetch} />

  const days = benchAgeDays(candidate.bench_start_date)
  const bucket = benchAgeBucket(days)

  return (
    <div>
      <PageHeader
        title={`${candidate.first_name} ${candidate.last_name}`}
        description={candidate.target_title ?? candidate.current_title ?? undefined}
        actions={<Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <StatusBadge status={candidate.status} kind="candidate" />
        <Badge color={bucket.color}>Bench: {days}d ({bucket.label})</Badge>
        {candidate.primary_skill && <Badge color="blue">{candidate.primary_skill}</Badge>}
        {candidate.work_authorization && <Badge color="purple">{candidate.work_authorization.replace(/_/g, ' ').toUpperCase()}</Badge>}
        {candidate.location && <Badge color="gray">{candidate.location}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Tabs
            tabs={[
              {
                label: 'Overview',
                content: (
                  <Card>
                    <CardBody className="grid grid-cols-2 gap-4 text-sm">
                      <Row label="Email">{candidate.email ?? '—'}</Row>
                      <Row label="Phone">{candidate.phone ?? '—'}</Row>
                      <Row label="Current title">{candidate.current_title ?? '—'}</Row>
                      <Row label="Target title">{candidate.target_title ?? '—'}</Row>
                      <Row label="Total experience">{candidate.total_experience_years ? `${candidate.total_experience_years} yrs` : '—'}</Row>
                      <Row label="Expected rate">{candidate.expected_rate ? `$${candidate.expected_rate}/hr` : '—'}</Row>
                      <Row label="Preferred work mode">{candidate.preferred_work_mode}</Row>
                      <Row label="Education">{candidate.education ?? '—'}</Row>
                      <div className="col-span-2">
                        <span className="text-gray-500">Secondary skills:</span>{' '}
                        {candidate.secondary_skills.length ? candidate.secondary_skills.map((s) => <Badge key={s} color="gray">{s}</Badge>) : '—'}
                      </div>
                    </CardBody>
                  </Card>
                ),
              },
              { label: 'Documents', content: <CandidateDocuments candidateId={candidate.id} /> },
              { label: 'Resume AI', content: <CandidateResumeAI candidateId={candidate.id} /> },
              { label: 'Marketing', content: <CandidateMarketing candidateId={candidate.id} /> },
              {
                label: 'Submissions',
                content: (submissionsQ.data ?? []).length === 0
                  ? <EmptyState title="Not submitted to any jobs yet" />
                  : (
                    <div className="space-y-2">
                      {submissionsQ.data!.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3 text-sm">
                          <span className="text-gray-200">Bill ${s.bill_rate ?? '—'} / Pay ${s.pay_rate ?? '—'}</span>
                          <StatusBadge status={s.status} kind="submission" />
                        </div>
                      ))}
                    </div>
                  ),
              },
              { label: 'Timeline & Notes', content: <EntityTimeline entityType="candidate" entityId={candidate.id} /> },
            ]}
          />
        </div>

        <Card>
          <CardHeader><h3 className="font-medium text-gray-200">Bench Info</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Bench status"><Badge color="orange">{candidate.bench_status.replace(/_/g, ' ')}</Badge></Row>
            <Row label="Bench start">{candidate.bench_start_date}</Row>
            <Row label="Recruiter">{userLabel(users, candidate.recruiter_owner_id)}</Row>
            <Row label="Sales owner">{userLabel(users, candidate.sales_owner_id)}</Row>
            <Row label="Marketing owner">{userLabel(users, candidate.marketing_owner_id)}</Row>
            <Row label="Priority"><StatusBadge status={candidate.priority} kind="priority" /></Row>
          </CardBody>
        </Card>
      </div>

      <CandidateForm open={editOpen} onClose={() => setEditOpen(false)} candidate={candidate} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1c1d24] pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{children}</span>
    </div>
  )
}
