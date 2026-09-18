import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { placementHooks, candidateHooks, companyHooks } from '../../lib/entities'
import { PlacementForm } from './PlacementForm'
import type { Placement } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

const statusColor: Record<string, 'blue' | 'green' | 'gray' | 'red'> = {
  pending_start: 'blue', active: 'green', completed: 'gray', terminated: 'red',
}

export function PlacementsList() {
  const [params, setParams] = useSearchParams()
  const { data: placements, isLoading, error, refetch } = placementHooks.useList()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: companies } = companyHooks.useList('id,name')
  const del = placementHooks.useDelete()

  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Placement | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Placement | null>(null)

  const candidateName = (id: string) => {
    const c = candidates?.find((c: any) => c.id === id)
    return c ? `${(c as any).first_name} ${(c as any).last_name}` : '—'
  }
  const companyName = (id: string | null) => (id && (companies?.find((c: any) => c.id === id) as any)?.name) ?? '—'

  const filtered = useMemo(() => (placements ?? []).filter((p) => !status || p.status === status), [placements, status])

  const totalMargin = filtered.reduce((sum, p) => sum + Number(p.margin ?? 0), 0)
  const monthlyRevenue = filtered.filter((p) => p.status === 'active').reduce((sum, p) => sum + Number(p.bill_rate) * 160, 0)

  const columns: Column<Placement>[] = [
    { key: 'candidate', header: 'Candidate', render: (p) => <span className="font-medium text-gray-100">{candidateName(p.candidate_id)}</span> },
    { key: 'company', header: 'Company', render: (p) => companyName(p.company_id) },
    { key: 'position', header: 'Position', render: (p) => p.position ?? '—' },
    { key: 'pay', header: 'Pay Rate', render: (p) => `$${p.pay_rate}/hr` },
    { key: 'bill', header: 'Bill Rate', render: (p) => `$${p.bill_rate}/hr` },
    { key: 'margin', header: 'Margin', render: (p) => <span className="font-medium text-green-400">${Number(p.margin).toFixed(2)}/hr</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge color={statusColor[p.status]}>{p.status.replace(/_/g, ' ')}</Badge> },
    { key: 'date', header: 'Placement Date', render: (p) => format(new Date(p.placement_date), 'MMM d, yyyy'), sortValue: (p) => p.placement_date },
  ]

  return (
    <div>
      <PageHeader
        title="Placements"
        description="Confirmed placements and their margin"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Placement</Button>}
      />

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#22232b] bg-[#14151a] p-4">
          <p className="text-xs text-gray-500">Total Placements</p>
          <p className="text-xl font-semibold text-gray-100">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-[#22232b] bg-[#14151a] p-4">
          <p className="text-xs text-gray-500">Total Margin ($/hr, sum)</p>
          <p className="text-xl font-semibold text-green-400">${totalMargin.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[#22232b] bg-[#14151a] p-4">
          <p className="text-xs text-gray-500">Est. Active Monthly Revenue</p>
          <p className="text-xl font-semibold text-gray-100">${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['pending_start', 'active', 'completed', 'terminated'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No placements yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Placement</Button>}
        rowActions={(p) => (
          <>
            <RowMenuItem onClick={() => { setEditing(p); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(p)}>Delete</RowMenuItem>
          </>
        )}
      />

      <PlacementForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} placement={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete placement"
        message="Delete this placement record?"
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
