import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { opportunityHooks, companyHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import type { Opportunity, OpportunityStage } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { OpportunityForm } from './OpportunityForm'

const stages: { key: OpportunityStage; label: string }[] = [
  { key: 'new_opportunity', label: 'New Opportunity' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'requirement_received', label: 'Requirement Received' },
  { key: 'proposal_discussion', label: 'Proposal / Discussion' },
  { key: 'active_hiring', label: 'Active Hiring' },
  { key: 'submission_activity', label: 'Submission Activity' },
  { key: 'interview', label: 'Interview' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
]

export function Pipeline() {
  const navigate = useNavigate()
  const { data: opportunities, isLoading, error, refetch } = opportunityHooks.useList()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: users } = useOrgUsers()
  const update = opportunityHooks.useUpdate()
  const [formOpen, setFormOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, Opportunity[]>()
    for (const s of stages) map.set(s.key, [])
    for (const o of opportunities ?? []) map.get(o.stage)?.push(o)
    return map
  }, [opportunities])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />

  async function moveTo(stage: OpportunityStage) {
    if (!dragId) return
    await update.mutateAsync({ id: dragId, stage } as any)
    setDragId(null)
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Sales Pipeline"
        description="Drag opportunities between stages"
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Opportunity</Button>}
      />
      <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div
            key={stage.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveTo(stage.key)}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-[#22232b] bg-[#101116]"
          >
            <div className="flex items-center justify-between border-b border-[#1c1d24] px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{stage.label}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">{grouped.get(stage.key)?.length ?? 0}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {grouped.get(stage.key)?.map((opp) => (
                <div
                  key={opp.id}
                  draggable
                  onDragStart={() => setDragId(opp.id)}
                  onClick={() => navigate(`/pipeline/${opp.id}`)}
                  className="cursor-grab rounded-lg border border-[#22232b] bg-[#16171d] p-3 active:cursor-grabbing hover:border-orange-500/40"
                >
                  <p className="text-sm font-medium text-gray-100">{opp.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{companies?.find((c) => c.id === opp.company_id)?.name ?? '—'}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>${Number(opp.estimated_value ?? 0).toLocaleString()}</span>
                    <span>{opp.probability}%</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-gray-600">{userLabel(users, opp.owner_id)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <OpportunityForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
