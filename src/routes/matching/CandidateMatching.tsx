import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { jobHooks, candidateHooks, companyHooks } from '../../lib/entities'
import { computeMatches } from '../../lib/matching'
import { api, ApiError } from '../../lib/apiClient'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody } from '../../components/ui/Card'
import { EmptyState, LoadingState } from '../../components/ui/States'
import { Sparkles, AlertTriangle } from 'lucide-react'

export function CandidateMatching() {
  const navigate = useNavigate()
  const { data: jobs, isLoading: jobsLoading } = jobHooks.useList()
  const { data: candidates, isLoading: candidatesLoading } = candidateHooks.useList()
  const { data: companies } = companyHooks.useList('id,name')
  const [jobId, setJobId] = useState('')
  const [explanations, setExplanations] = useState<Record<string, { summary: string; concerns: string[] }>>({})
  const [explaining, setExplaining] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const statusQ = useQuery({ queryKey: ['integration-status'], queryFn: async () => api.get<{ openai: boolean }>('/status') })

  const job = jobs?.find((j) => j.id === jobId)
  const matches = useMemo(() => (job && candidates ? computeMatches(job, candidates, 15) : []), [job, candidates])

  async function explainWithAI() {
    if (!job || matches.length === 0) return
    setExplaining(true)
    setAiError(null)
    try {
      const res = await api.post<{ explanations: { candidate_id: string; summary: string; concerns: string[] }[] }>('/matching/explain', {
        jobId: job.id,
        candidateIds: matches.map((m) => m.candidate.id),
      })
      const map: Record<string, { summary: string; concerns: string[] }> = {}
      for (const e of res.explanations) map[e.candidate_id] = { summary: e.summary, concerns: e.concerns }
      setExplanations(map)
    } catch (e) {
      setAiError(e instanceof ApiError ? e.message : 'AI explanation failed')
    } finally {
      setExplaining(false)
    }
  }

  if (jobsLoading || candidatesLoading) return <LoadingState />

  return (
    <div>
      <PageHeader title="Candidate Matching" description="Match bench candidates against a job requirement, ranked by real skill/availability overlap" />

      <Card className="mb-5">
        <CardBody className="flex items-end gap-3">
          <Select label="Job requirement" value={jobId} onChange={(e) => { setJobId(e.target.value); setExplanations({}) }} className="max-w-md">
            <option value="">Select a job…</option>
            {jobs?.map((j) => <option key={j.id} value={j.id}>{j.title} — {companies?.find((c) => c.id === j.company_id)?.name ?? 'No company'}</option>)}
          </Select>
          {job && (
            <Button onClick={explainWithAI} loading={explaining} disabled={matches.length === 0 || statusQ.data?.openai === false}>
              <Sparkles className="h-4 w-4" /> Explain with AI
            </Button>
          )}
        </CardBody>
      </Card>

      {statusQ.data && !statusQ.data.openai && job && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>AI-enhanced explanations need OPENAI_API_KEY set on the backend. The ranked list below is still real — it's computed from skill, work-mode, and availability data, just without the plain-language write-up.</span>
        </div>
      )}
      {aiError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{aiError}</span>
        </div>
      )}

      {!job ? (
        <EmptyState title="Select a job to see matching bench candidates" />
      ) : matches.length === 0 ? (
        <EmptyState title="No bench candidates match this job's required skills yet" />
      ) : (
        <div className="space-y-3">
          {matches.map(({ candidate: c, score, matched, missing }) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <button onClick={() => navigate(`/candidates/${c.id}`)} className="text-sm font-medium text-gray-100 hover:text-orange-400">
                    {c.first_name} {c.last_name}
                  </button>
                  <Badge color={score >= 70 ? 'green' : score >= 40 ? 'orange' : 'gray'}>{score}% match</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {matched.map((m) => <Badge key={m} color="green">{m}</Badge>)}
                  {missing.map((m) => <Badge key={m} color="red">missing: {m}</Badge>)}
                </div>
                {explanations[c.id] && (
                  <div className="mt-3 rounded-lg bg-white/[0.02] p-3 text-sm">
                    <p className="text-gray-300">{explanations[c.id].summary}</p>
                    {explanations[c.id].concerns.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-yellow-300">
                        {explanations[c.id].concerns.map((concern, i) => <li key={i}>{concern}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
