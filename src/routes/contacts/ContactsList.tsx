import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { contactHooks, companyHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { ContactForm } from './ContactForm'
import type { Contact } from '../../lib/domain'
import { Plus } from 'lucide-react'

export function ContactsList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: contacts, isLoading, error, refetch } = contactHooks.useList()
  const { data: companies } = companyHooks.useList('id,name')
  const { data: users } = useOrgUsers()
  const del = contactHooks.useDelete()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Contact | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Contact | null>(null)

  const companyName = (id: string | null) => companies?.find((c) => c.id === id)?.name ?? '—'

  const filtered = useMemo(() => {
    return (contacts ?? []).filter((c) => {
      if (type && c.contact_type !== type) return false
      if (search) {
        const s = search.toLowerCase()
        const hay = `${c.first_name} ${c.last_name} ${c.email ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [contacts, search, type])

  const columns: Column<Contact>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium text-gray-100">{c.first_name} {c.last_name}</span>, sortValue: (c) => `${c.first_name} ${c.last_name}` },
    { key: 'title', header: 'Title', render: (c) => c.title ?? '—' },
    { key: 'company', header: 'Company', render: (c) => companyName(c.company_id) },
    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
    { key: 'type', header: 'Type', render: (c) => <Badge color="blue">{c.contact_type.replace(/_/g, ' ')}</Badge> },
    { key: 'owner', header: 'Owner', render: (c) => userLabel(users, c.owner_id) },
  ]

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Everyone you work with: hiring managers, vendors, and more"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Contact</Button>}
      />
      <Toolbar>
        <Input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[200px]">
          <option value="">All types</option>
          {['client', 'hiring_manager', 'recruiter', 'vendor', 'msp', 'implementation_partner', 'candidate_contact', 'reference', 'other'].map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        {(search || type) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setType('') }}>Clear filters</Button>}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        onRowClick={(c) => navigate(`/contacts/${c.id}`)}
        emptyTitle="No contacts yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Contact</Button>}
        rowActions={(c) => (
          <>
            <RowMenuItem onClick={() => navigate(`/contacts/${c.id}`)}>View</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(c); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(c)}>Delete</RowMenuItem>
          </>
        )}
      />

      <ContactForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} contact={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete contact"
        message={`Delete contact "${toDelete?.first_name} ${toDelete?.last_name}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
