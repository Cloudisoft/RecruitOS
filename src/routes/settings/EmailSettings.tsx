import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/apiClient'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { emailTemplateHooks } from '../../lib/entities'
import { EmailTemplateForm } from './EmailTemplateForm'
import { ComposeEmailModal } from './ComposeEmailModal'
import type { EmailTemplate } from '../../lib/domain'
import { Plus, Send, AlertTriangle } from 'lucide-react'

export function EmailSettings() {
  const { data: templates, isLoading, error, refetch } = emailTemplateHooks.useList()
  const del = emailTemplateHooks.useDelete()
  const statusQ = useQuery({ queryKey: ['integration-status'], queryFn: async () => api.get<{ email: boolean }>('/status') })

  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null)

  const columns: Column<EmailTemplate>[] = [
    { key: 'name', header: 'Template', render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    { key: 'category', header: 'Category', render: (t) => <Badge color="blue">{t.category.replace(/_/g, ' ')}</Badge> },
    { key: 'subject', header: 'Subject', render: (t) => t.subject },
  ]

  return (
    <div>
      <PageHeader
        title="Email"
        description="Templates and sending — logged against candidates, companies, and jobs automatically"
        actions={
          <>
            <Button variant="secondary" onClick={() => setComposeOpen(true)}><Send className="h-4 w-4" /> Compose</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Template</Button>
          </>
        }
      />

      {statusQ.data && !statusQ.data.email && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No email provider configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS on the backend to actually send mail — see Settings → Integrations.</span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={templates ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No email templates yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Template</Button>}
        rowActions={(t) => (
          <>
            <RowMenuItem onClick={() => { setEditing(t); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(t)}>Delete</RowMenuItem>
          </>
        )}
      />

      <EmailTemplateForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null) }} template={editing} />
      <ComposeEmailModal open={composeOpen} onClose={() => setComposeOpen(false)} emailConfigured={statusQ.data?.email ?? false} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete template"
        message={`Delete template "${toDelete?.name}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
