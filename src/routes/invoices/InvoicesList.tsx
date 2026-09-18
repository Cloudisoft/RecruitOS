import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { invoiceHooks, companyHooks } from '../../lib/entities'
import { InvoiceForm } from './InvoiceForm'
import type { Invoice } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

const statusColor: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'orange'> = {
  draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', void: 'orange',
}

export function InvoicesList() {
  const [params, setParams] = useSearchParams()
  const { data: invoices, isLoading, error, refetch } = invoiceHooks.useList()
  const { data: companies } = companyHooks.useList('id,name')
  const del = invoiceHooks.useDelete()

  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Invoice | null>(null)

  const companyName = (id: string | null) => (id && (companies?.find((c) => c.id === id) as any)?.name) ?? '—'
  const filtered = (invoices ?? []).filter((i) => !status || i.status === status)

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', render: (i) => <span className="font-medium text-gray-900">{i.invoice_number}</span> },
    { key: 'company', header: 'Company', render: (i) => companyName(i.company_id) },
    { key: 'amount', header: 'Amount', render: (i) => `$${Number(i.amount).toLocaleString()}` },
    { key: 'status', header: 'Status', render: (i) => <Badge color={statusColor[i.status]}>{i.status}</Badge> },
    { key: 'issue', header: 'Issue Date', render: (i) => format(new Date(i.issue_date), 'MMM d, yyyy'), sortValue: (i) => i.issue_date },
    { key: 'due', header: 'Due Date', render: (i) => i.due_date ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Client invoices generated from placements"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Invoice</Button>}
      />
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          {['draft', 'sent', 'paid', 'overdue', 'void'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No invoices yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Button>}
        rowActions={(i) => (
          <>
            <RowMenuItem onClick={() => { setEditing(i); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(i)}>Delete</RowMenuItem>
          </>
        )}
      />

      <InvoiceForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} invoice={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete invoice"
        message={`Delete invoice "${toDelete?.invoice_number}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
