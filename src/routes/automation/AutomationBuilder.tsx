import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { automationHooks } from '../../lib/entities'
import { AutomationForm } from './AutomationForm'
import type { Automation } from '../../lib/domain'
import { Plus } from 'lucide-react'

export function AutomationBuilder() {
  const { data: automations, isLoading, error, refetch } = automationHooks.useList()
  const update = automationHooks.useUpdate()
  const del = automationHooks.useDelete()

  const [editingId, setEditingId] = useState<string | null | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Automation | null>(null)

  const columns: Column<Automation>[] = [
    { key: 'name', header: 'Automation', render: (a) => <span className="font-medium text-gray-900">{a.name}</span> },
    { key: 'when', header: 'When', render: (a) => <Badge color="blue">{a.trigger_entity} · {(a.trigger_condition as any)?.to_value || 'any change'}</Badge> },
    { key: 'active', header: 'Status', render: (a) => <Badge color={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Active' : 'Paused'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Automation Builder"
        description="Define WHEN a status changes, THEN what happens — executed automatically by the database"
        actions={<Button onClick={() => { setEditingId(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Automation</Button>}
      />

      <DataTable
        columns={columns}
        rows={automations ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No automations yet"
        emptyDescription={'Example: "When candidate enters Ready to Market, create a marketing task and set bench status to Marketing."'}
        emptyAction={<Button onClick={() => { setEditingId(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Automation</Button>}
        rowActions={(a) => (
          <>
            <RowMenuItem onClick={() => { setEditingId(a.id); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem onClick={() => update.mutate({ id: a.id, is_active: !a.is_active } as any)}>{a.is_active ? 'Pause' : 'Activate'}</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(a)}>Delete</RowMenuItem>
          </>
        )}
      />

      <AutomationForm open={formOpen} onClose={() => { setFormOpen(false); refetch() }} automationId={editingId} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete automation"
        message={`Delete automation "${toDelete?.name}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
