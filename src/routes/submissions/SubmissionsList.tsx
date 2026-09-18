import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { submissionHooks, candidateHooks, jobHooks } from '../../lib/entities'
import { SubmissionForm } from './SubmissionForm'
import type { Submission } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export function SubmissionsList() {
  const [params, setParams] = useSearchParams()
  const { data: submissions, isLoading, error, refetch } = submissionHooks.useList()
  const { data: candidates } = candidateHooks.useList('id,first_name,last_name')
  const { data: jobs } = jobHooks.useList('id,title')
  const del = submissionHooks.useDelete()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Submission | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Submission | null>(null)

  const candidateName = (id: string) => {
    const c = candidates?.find((c: any) => c.id === id)
    return c ? `${(c as any).first_name} ${(c as any).last_name}` : '—'
  }
  const jobTitle = (id: string) => (jobs?.find((j: any) => j.id === id) as any)?.title ?? '—'

  const filtered = useMemo(() => {
    return (submissions ?? []).filter((s) => {
      if (status && s.status !== status) return false
      if (search) {
        const s2 = search.toLowerCase()
        const hay = `${candidateName(s.candidate_id)} ${jobTitle(s.job_id)}`.toLowerCase()
        if (!hay.includes(s2)) return false
      }
      return true
    })
  }, [submissions, search, status, candidates, jobs])

  const columns: Column<Submission>[] = [
    { key: 'candidate', header: 'Candidate', render: (s) => <span className="font-medium text-gray-100">{candidateName(s.candidate_id)}</span> },
    { key: 'job', header: 'Job', render: (s) => jobTitle(s.job_id) },
    { key: 'bill', header: 'Bill Rate', render: (s) => s.bill_rate ? `$${s.bill_rate}/hr` : '—' },
    { key: 'pay', header: 'Pay Rate', render: (s) => s.pay_rate ? `$${s.pay_rate}/hr` : '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} kind="submission" /> },
    { key: 'date', header: 'Submitted', render: (s) => format(new Date(s.submission_date), 'MMM d, yyyy'), sortValue: (s) => s.submission_date },
  ]

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Every candidate submitted to a client requirement"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Submission</Button>}
      />
      <Toolbar>
        <Input placeholder="Search submissions…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
          <option value="">All statuses</option>
          {['submitted', 'resume_requested', 'client_reviewing', 'shortlisted', 'rejected', 'interview', 'offer', 'withdrawn', 'placed'].map((s) => (
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
        emptyTitle="No submissions yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Submission</Button>}
        rowActions={(s) => (
          <>
            <RowMenuItem onClick={() => { setEditing(s); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(s)}>Delete</RowMenuItem>
          </>
        )}
      />

      <SubmissionForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} submission={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete submission"
        message="Delete this submission? This cannot be undone."
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
