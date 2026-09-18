import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { interviewHooks, candidateHooks, jobHooks } from '../../lib/entities'
import { InterviewForm } from './InterviewForm'
import { InterviewCalendar } from './InterviewCalendar'
import type { Interview } from '../../lib/domain'
import { Plus, List, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

export function InterviewsList() {
  const [params, setParams] = useSearchParams()
  const { data: interviews, isLoading, error, refetch } = interviewHooks.useList()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title')
  const del = interviewHooks.useDelete()

  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Interview | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Interview | null>(null)

  const candidateName = (id: string) => {
    const c = candidates?.find((c: any) => c.id === id)
    return c ? `${(c as any).first_name} ${(c as any).last_name}` : '—'
  }
  const jobTitle = (id: string | null) => (id && jobs?.find((j: any) => j.id === id) as any)?.title ?? '—'

  const filtered = useMemo(() => (interviews ?? []).filter((i) => !status || i.status === status), [interviews, status])

  const columns: Column<Interview>[] = [
    { key: 'candidate', header: 'Candidate', render: (i) => <span className="font-medium text-gray-900">{candidateName(i.candidate_id)}</span> },
    { key: 'job', header: 'Job', render: (i) => jobTitle(i.job_id) },
    { key: 'type', header: 'Type', render: (i) => <Badge color="purple">{i.interview_type}</Badge> },
    { key: 'round', header: 'Round', render: (i) => i.round },
    { key: 'when', header: 'When', render: (i) => format(new Date(i.scheduled_at), 'MMM d, yyyy h:mm a'), sortValue: (i) => i.scheduled_at },
    { key: 'status', header: 'Status', render: (i) => <Badge color={i.status === 'completed' ? 'green' : i.status === 'cancelled' || i.status === 'no_show' ? 'red' : 'blue'}>{i.status.replace(/_/g, ' ')}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Interviews"
        description="Every interview scheduled across your bench candidates"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Schedule Interview</Button>}
      />
      <Toolbar>
        <div className="flex rounded-lg border border-[#d1d5db] p-0.5">
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm ${view === 'list' ? 'bg-orange-500/15 text-orange-600' : 'text-gray-600'}`}>
            <List className="h-4 w-4" /> List
          </button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm ${view === 'calendar' ? 'bg-orange-500/15 text-orange-600' : 'text-gray-600'}`}>
            <CalendarDays className="h-4 w-4" /> Calendar
          </button>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['scheduled', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </Toolbar>

      {view === 'list' ? (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={refetch}
          emptyTitle="No interviews scheduled yet"
          emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Schedule Interview</Button>}
          rowActions={(i) => (
            <>
              <RowMenuItem onClick={() => { setEditing(i); setFormOpen(true) }}>Edit</RowMenuItem>
              <RowMenuItem danger onClick={() => setToDelete(i)}>Delete</RowMenuItem>
            </>
          )}
        />
      ) : (
        <InterviewCalendar interviews={filtered} onSelect={(i) => { setEditing(i); setFormOpen(true) }} />
      )}

      <InterviewForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} interview={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete interview"
        message="Delete this interview? This cannot be undone."
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
