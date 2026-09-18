import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { candidateHooks } from '../../lib/entities'
import { PageHeader } from '../../components/ui/PageHeader'
import { Input } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { Sparkles } from 'lucide-react'

export function ResumeAILanding() {
  const navigate = useNavigate()
  const { data: candidates, isLoading } = candidateHooks.useList()
  const [search, setSearch] = useState('')

  if (isLoading) return <LoadingState />

  const filtered = (candidates ?? []).filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.primary_skill ?? ''}`.toLowerCase().includes(s)
  })

  return (
    <div>
      <PageHeader title="Resume AI" description="Pick a candidate to parse, analyze, enhance, or generate a tailored resume" />
      <Input placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />

      {filtered.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No candidates found" />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:border-orange-500/40" >
              <CardBody onClick={() => navigate(`/candidates/${c.id}`)}>
                <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                <p className="text-sm text-gray-500">{c.primary_skill ?? c.current_title ?? '—'}</p>
                <p className="mt-2 text-xs text-orange-600">Open Resume AI tab →</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
