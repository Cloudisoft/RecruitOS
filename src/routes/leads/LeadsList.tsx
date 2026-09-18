import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { leadHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { LeadForm } from './LeadForm'
import type { Lead } from '../../lib/domain'
import { Plus, Target } from 'lucide-react'
import { format } from 'date-fns'

export function LeadsList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: leads, isLoading, error, refetch } = leadHooks.useList()
  const { data: users } = useOrgUsers()
  const del = leadHooks.useDelete()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Lead | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Lead | null>(null)

  const filtered = useMemo(() => {
    return (leads ?? []).filter((l) => {
      if (status && l.status !== status) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${l.first_name} ${l.last_name} ${l.company ?? ''} ${l.email ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [leads, search, status])

  const columns: Column<Lead>[] = [
    { key: 'name', header: 'Name', render: (l) => <span className="font-medium text-gray-100">{l.first_name} {l.last_name}</span>, sortValue: (l) => `${l.first_name} ${l.last_name}` },
    { key: 'company', header: 'Company', render: (l) => l.company ?? '—' },
    { key: 'email', header: 'Email', render: (l) => l.email ?? '—' },
    { key: 'source', header: 'Source', render: (l) => l.source.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} kind="lead" /> },
    { key: 'priority', header: 'Priority', render: (l) => <StatusBadge status={l.priority} kind="priority" /> },
    { key: 'owner', header: 'Owner', render: (l) => userLabel(users, l.owner_id) },
    { key: 'created', header: 'Created', render: (l) => format(new Date(l.created_at), 'MMM d, yyyy'), sortValue: (l) => l.created_at },
  ]

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track and qualify new business opportunities"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Lead</Button>}
      />
      <Toolbar>
        <Input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['new', 'contacted', 'qualified', 'nurturing', 'sales_opportunity', 'converted', 'lost', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        {(search || status) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus('') }}>Clear filters</Button>}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        onRowClick={(l) => navigate(`/leads/${l.id}`)}
        emptyTitle="No leads yet"
        emptyDescription="Add your first lead to start building your pipeline."
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Lead</Button>}
        rowActions={(l) => (
          <>
            <RowMenuItem onClick={() => navigate(`/leads/${l.id}`)}>View</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(l); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(l)}>Delete</RowMenuItem>
          </>
        )}
      />

      <LeadForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} lead={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete lead"
        message={`Delete lead "${toDelete?.first_name} ${toDelete?.last_name}"? This cannot be undone.`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await del.mutateAsync(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

export const leadsIcon = Target
