import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { offerHooks, candidateHooks, jobHooks } from '../../lib/entities'
import { OfferForm } from './OfferForm'
import type { Offer } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

const statusColor: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  draft: 'gray', presented: 'blue', accepted: 'green', declined: 'red', withdrawn: 'red',
}

export function OffersList() {
  const [params, setParams] = useSearchParams()
  const { data: offers, isLoading, error, refetch } = offerHooks.useList()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title')
  const del = offerHooks.useDelete()

  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Offer | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Offer | null>(null)

  const candidateName = (id: string) => {
    const c = candidates?.find((c: any) => c.id === id)
    return c ? `${(c as any).first_name} ${(c as any).last_name}` : '—'
  }
  const jobTitle = (id: string | null) => (id && (jobs?.find((j: any) => j.id === id) as any)?.title) ?? '—'

  const filtered = useMemo(() => (offers ?? []).filter((o) => !status || o.status === status), [offers, status])

  const columns: Column<Offer>[] = [
    { key: 'candidate', header: 'Candidate', render: (o) => <span className="font-medium text-gray-100">{candidateName(o.candidate_id)}</span> },
    { key: 'job', header: 'Job', render: (o) => jobTitle(o.job_id) },
    { key: 'position', header: 'Position', render: (o) => o.position ?? '—' },
    { key: 'rate', header: 'Rate', render: (o) => o.rate ? `$${o.rate}/hr` : '—' },
    { key: 'status', header: 'Status', render: (o) => <Badge color={statusColor[o.status]}>{o.status}</Badge> },
    { key: 'date', header: 'Offer Date', render: (o) => format(new Date(o.offer_date), 'MMM d, yyyy'), sortValue: (o) => o.offer_date },
  ]

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Track offers presented to bench candidates through acceptance"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Offer</Button>}
      />
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['draft', 'presented', 'accepted', 'declined', 'withdrawn'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No offers yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Offer</Button>}
        rowActions={(o) => (
          <>
            <RowMenuItem onClick={() => { setEditing(o); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(o)}>Delete</RowMenuItem>
          </>
        )}
      />

      <OfferForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} offer={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete offer"
        message="Delete this offer? This cannot be undone."
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
