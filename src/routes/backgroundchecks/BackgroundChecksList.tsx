import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { backgroundCheckHooks, candidateHooks } from '../../lib/entities'
import { BackgroundCheckForm } from './BackgroundCheckForm'
import type { BackgroundCheck } from '../../lib/domain'
import { Plus } from 'lucide-react'

const statusColor: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'orange'> = {
  not_started: 'gray', initiated: 'blue', in_progress: 'yellow', passed: 'green', failed: 'red', needs_review: 'orange', completed: 'green',
}

export function BackgroundChecksList() {
  const [params, setParams] = useSearchParams()
  const { data: checks, isLoading, error, refetch } = backgroundCheckHooks.useList()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const del = backgroundCheckHooks.useDelete()

  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<BackgroundCheck | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<BackgroundCheck | null>(null)

  const candidateName = (id: string) => {
    const c = candidates?.find((c: any) => c.id === id)
    return c ? `${(c as any).first_name} ${(c as any).last_name}` : '—'
  }

  const filtered = useMemo(() => (checks ?? []).filter((c) => !status || c.status === status), [checks, status])

  const columns: Column<BackgroundCheck>[] = [
    { key: 'candidate', header: 'Candidate', render: (c) => <span className="font-medium text-gray-100">{candidateName(c.candidate_id)}</span> },
    { key: 'type', header: 'Type', render: (c) => <Badge color="purple">{c.verification_type.replace(/_/g, ' ')}</Badge> },
    { key: 'provider', header: 'Provider', render: (c) => c.verification_provider ?? '—' },
    { key: 'status', header: 'Status', render: (c) => <Badge color={statusColor[c.status]}>{c.status.replace(/_/g, ' ')}</Badge> },
    { key: 'initiated', header: 'Initiated', render: (c) => c.initiated_at ?? '—' },
    { key: 'completed', header: 'Completed', render: (c) => c.completed_at ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Background Checks"
        description="Verification records for candidates who accepted an offer"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Record</Button>}
      />
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
          <option value="">All statuses</option>
          {['not_started', 'initiated', 'in_progress', 'passed', 'failed', 'needs_review', 'completed'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No background checks yet"
        emptyDescription="These are created automatically when an offer is accepted, or you can add one manually."
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Record</Button>}
        rowActions={(c) => (
          <>
            <RowMenuItem onClick={() => { setEditing(c); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(c)}>Delete</RowMenuItem>
          </>
        )}
      />

      <BackgroundCheckForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} check={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete background check"
        message="Delete this background check record?"
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
