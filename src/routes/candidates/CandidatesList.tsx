import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { candidateHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { CandidateForm } from './CandidateForm'
import type { Candidate } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { benchAgeBucket, benchAgeDays } from '../../lib/benchAging'

export function CandidatesList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: candidates, isLoading, error, refetch } = candidateHooks.useList()
  const { data: users } = useOrgUsers()
  const del = candidateHooks.useDelete()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Candidate | null>(null)

  const filtered = useMemo(() => {
    return (candidates ?? []).filter((c) => {
      if (status && c.status !== status) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${c.first_name} ${c.last_name} ${c.primary_skill ?? ''} ${c.email ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [candidates, search, status])

  const columns: Column<Candidate>[] = [
    { key: 'name', header: 'Candidate', render: (c) => <span className="font-medium text-gray-900">{c.first_name} {c.last_name}</span>, sortValue: (c) => `${c.first_name} ${c.last_name}` },
    { key: 'skill', header: 'Primary Skill', render: (c) => c.primary_skill ?? '—' },
    { key: 'title', header: 'Target Title', render: (c) => c.target_title ?? c.current_title ?? '—' },
    { key: 'auth', header: 'Work Auth', render: (c) => c.work_authorization?.replace(/_/g, ' ').toUpperCase() ?? '—' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} kind="candidate" /> },
    {
      key: 'aging', header: 'Bench Aging', render: (c) => {
        const days = benchAgeDays(c.bench_start_date)
        const bucket = benchAgeBucket(days)
        return <Badge color={bucket.color}>{days}d · {bucket.label}</Badge>
      },
      sortValue: (c) => benchAgeDays(c.bench_start_date),
    },
    { key: 'owner', header: 'Recruiter', render: (c) => userLabel(users, c.recruiter_owner_id) },
  ]

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Your bench: every consultant available for placement"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Candidate</Button>}
      />
      <Toolbar>
        <Input placeholder="Search by name, skill, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
          <option value="">All statuses</option>
          {['new', 'screening', 'ready_to_market', 'marketing', 'submitted', 'interviewing', 'offer', 'background_check', 'placed', 'on_hold', 'rejected', 'withdrawn', 'inactive'].map((s) => (
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
        onRowClick={(c) => navigate(`/candidates/${c.id}`)}
        emptyTitle="No candidates yet"
        emptyDescription="Add your first bench candidate to get started."
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Candidate</Button>}
        rowActions={(c) => (
          <>
            <RowMenuItem onClick={() => navigate(`/candidates/${c.id}`)}>View 360</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(c); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(c)}>Delete</RowMenuItem>
          </>
        )}
      />

      <CandidateForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} candidate={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete candidate"
        message={`Delete candidate "${toDelete?.first_name} ${toDelete?.last_name}"? This cannot be undone.`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
