import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { companyHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import type { Company } from '../../lib/domain'

const types = ['client', 'vendor', 'msp', 'staffing_company', 'direct_employer', 'partner']
const statuses = ['active', 'inactive', 'prospect', 'blacklisted']

export function CompanyForm({ open, onClose, company }: { open: boolean; onClose: () => void; company?: Company | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const create = companyHooks.useCreate()
  const update = companyHooks.useUpdate()
  const [form, setForm] = useState<Partial<Company>>({})

  useEffect(() => {
    setForm(company ?? { name: '', company_type: 'client', status: 'prospect', priority: 'medium', account_owner_id: profile?.id ?? null })
  }, [company, open, profile?.id])

  function set<K extends keyof Company>(key: K, value: Company[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name) return
    if (company) await update.mutateAsync({ id: company.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={company ? 'Edit Company' : 'New Company'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{company ? 'Save changes' : 'Create company'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company name" required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        <Input label="Website" value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
        <Input label="Industry" value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)} />
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Input label="Company size" value={form.company_size ?? ''} onChange={(e) => set('company_size', e.target.value)} />
        <Select label="Type" value={form.company_type ?? 'client'} onChange={(e) => set('company_type', e.target.value as any)}>
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Status" value={form.status ?? 'prospect'} onChange={(e) => set('status', e.target.value as any)}>
          {statuses.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Account owner" value={form.account_owner_id ?? ''} onChange={(e) => set('account_owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <div className="col-span-2">
          <Textarea label="Description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
