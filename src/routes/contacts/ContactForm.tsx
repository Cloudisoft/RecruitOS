import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { contactHooks } from '../../lib/entities'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { useAuth } from '../../contexts/AuthContext'
import { companyHooks } from '../../lib/entities'
import type { Contact } from '../../lib/domain'

const types = ['client', 'hiring_manager', 'recruiter', 'vendor', 'msp', 'implementation_partner', 'candidate_contact', 'reference', 'other']

export function ContactForm({ open, onClose, contact }: { open: boolean; onClose: () => void; contact?: Contact | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const { data: companies } = companyHooks.useList('id,name')
  const create = contactHooks.useCreate()
  const update = contactHooks.useUpdate()
  const [form, setForm] = useState<Partial<Contact>>({})

  useEffect(() => {
    setForm(contact ?? { first_name: '', last_name: '', contact_type: 'other', owner_id: profile?.id ?? null })
  }, [contact, open, profile?.id])

  function set<K extends keyof Contact>(key: K, value: Contact[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.first_name || !form.last_name) return
    if (contact) await update.mutateAsync({ id: contact.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Edit Contact' : 'New Contact'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{contact ? 'Save changes' : 'Create contact'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Last name" required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
        <Input label="Title" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        <Select label="Company" value={form.company_id ?? ''} onChange={(e) => set('company_id', e.target.value || null)}>
          <option value="">None</option>
          {companies?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        <Input label="Phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        <Input label="LinkedIn URL" value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} />
        <Input label="Location" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        <Select label="Contact type" value={form.contact_type ?? 'other'} onChange={(e) => set('contact_type', e.target.value as any)}>
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select label="Owner" value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value || null)}>
          <option value="">Unassigned</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
        <div className="col-span-2">
          <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
