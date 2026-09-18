import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { jobHooks, companyHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { JobForm } from './JobForm'
import type { Job } from '../../lib/domain'
import { Plus } from 'lucide-react'

export function JobsList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: jobs, isLoading, error, refetch } = jobHooks.useList()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: users } = useOrgUsers()
  const del = jobHooks.useDelete()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Job | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Job | null>(null)

  const companyName = (id: string | null) => companies?.find((c) => c.id === id)?.name ?? '—'

  const filtered = useMemo(() => {
    return (jobs ?? []).filter((j) => {
      if (status && j.status !== status) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${j.title} ${companyName(j.company_id)} ${j.location ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [jobs, search, status, companies])

  const columns: Column<Job>[] = [
    { key: 'title', header: 'Job Title', render: (j) => <span className="font-medium text-gray-100">{j.title}</span>, sortValue: (j) => j.title },
    { key: 'company', header: 'Client', render: (j) => companyName(j.company_id) },
    { key: 'location', header: 'Location', render: (j) => j.location ?? '—' },
    { key: 'rate', header: 'Rate', render: (j) => (j.rate_min || j.rate_max) ? `$${j.rate_min ?? '?'}-${j.rate_max ?? '?'}/hr` : '—' },
    { key: 'openings', header: 'Openings', render: (j) => j.openings },
    { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} kind="job" /> },
    { key: 'recruiter', header: 'Recruiter', render: (j) => userLabel(users, j.recruiter_id) },
  ]

  return (
    <div>
      <PageHeader
        title="Jobs / Requirements"
        description="Open client requirements ready for bench candidates"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Job</Button>}
      />
      <Toolbar>
        <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['new', 'open', 'sourcing', 'submitting', 'interviewing', 'filled', 'closed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
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
        onRowClick={(j) => navigate(`/jobs/${j.id}`)}
        emptyTitle="No jobs yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Job</Button>}
        rowActions={(j) => (
          <>
            <RowMenuItem onClick={() => navigate(`/jobs/${j.id}`)}>View</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(j); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(j)}>Delete</RowMenuItem>
          </>
        )}
      />

      <JobForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} job={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete job"
        message={`Delete job "${toDelete?.title}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
