import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { invoiceHooks, companyHooks, placementHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import type { Invoice } from '../../lib/domain'

const statuses = ['draft', 'sent', 'paid', 'overdue', 'void']

export function InvoiceForm({ open, onClose, invoice }: { open: boolean; onClose: () => void; invoice?: Invoice | null }) {
  const { profile } = useAuth()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: placements } = placementHooks.useList('id,candidate_id,bill_rate')
  const create = invoiceHooks.useCreate()
  const update = invoiceHooks.useUpdate()
  const [form, setForm] = useState<Partial<Invoice>>({})

  useEffect(() => {
    setForm(
      invoice ?? {
        invoice_number: `INV-${Date.now().toString().slice(-8)}`,
        status: 'draft', amount: 0, issue_date: new Date().toISOString().slice(0, 10),
      }
    )
  }, [invoice, open])

  function set<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.invoice_number) return
    if (invoice) await update.mutateAsync({ id: invoice.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={invoice ? 'Edit Invoice' : 'New Invoice'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.invoice_number}>{invoice ? 'Save changes' : 'Create invoice'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Invoice number" required value={form.invoice_number ?? ''} onChange={(e) => set('invoice_number', e.target.value)} />
        <Select label="Company" value={form.company_id ?? ''} onChange={(e) => set('company_id', e.target.value || null)}>
          <option value="">None</option>
          {companies?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Placement" value={form.placement_id ?? ''} onChange={(e) => set('placement_id', e.target.value || null)}>
          <option value="">None</option>
          {placements?.map((p: any) => <option key={p.id} value={p.id}>Placement {p.id.slice(0, 8)}</option>)}
        </Select>
        <Input label="Amount ($)" type="number" required value={form.amount ?? 0} onChange={(e) => set('amount', Number(e.target.value))} />
        <Select label="Status" value={form.status ?? 'draft'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input label="Issue date" type="date" value={form.issue_date ?? ''} onChange={(e) => set('issue_date', e.target.value)} />
        <Input label="Due date" type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} />
        <Input label="Paid date" type="date" value={form.paid_date ?? ''} onChange={(e) => set('paid_date', e.target.value)} />
      </div>
    </Modal>
  )
}
