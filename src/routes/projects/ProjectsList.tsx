import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { projectHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { ProjectForm } from './ProjectForm'
import type { Project } from '../../lib/domain'
import { Plus } from 'lucide-react'

const statusColor: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = { active: 'green', on_hold: 'yellow', completed: 'gray', cancelled: 'red' }

export function ProjectsList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: projects, isLoading, error, refetch } = projectHooks.useList()
  const { data: users } = useOrgUsers()
  const del = projectHooks.useDelete()

  const [editing, setEditing] = useState<Project | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Project | null>(null)

  const columns: Column<Project>[] = [
    { key: 'name', header: 'Project', render: (p) => <span className="font-medium text-gray-100">{p.name}</span>, sortValue: (p) => p.name },
    { key: 'status', header: 'Status', render: (p) => <Badge color={statusColor[p.status] ?? 'gray'}>{p.status.replace(/_/g, ' ')}</Badge> },
    { key: 'priority', header: 'Priority', render: (p) => <Badge color="orange">{p.priority}</Badge> },
    { key: 'owner', header: 'Owner', render: (p) => userLabel(users, p.owner_id) },
    { key: 'dates', header: 'Timeline', render: (p) => `${p.start_date ?? '—'} → ${p.end_date ?? '—'}` },
  ]

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Group tasks and candidates under recruitment drives and campaigns"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Project</Button>}
      />

      <DataTable
        columns={columns}
        rows={projects ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        onRowClick={(p) => navigate(`/projects/${p.id}`)}
        emptyTitle="No projects yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Project</Button>}
        rowActions={(p) => (
          <>
            <RowMenuItem onClick={() => navigate(`/projects/${p.id}`)}>View</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(p); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(p)}>Delete</RowMenuItem>
          </>
        )}
      />

      <ProjectForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} project={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete project"
        message={`Delete project "${toDelete?.name}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
