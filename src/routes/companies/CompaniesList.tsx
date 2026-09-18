import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { DataTable, RowMenuItem, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { companyHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { CompanyForm } from './CompanyForm'
import type { Company } from '../../lib/domain'
import { Plus } from 'lucide-react'

const statusColors: Record<string, 'green' | 'gray' | 'blue' | 'red'> = { active: 'green', inactive: 'gray', prospect: 'blue', blacklisted: 'red' }

export function CompaniesList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: companies, isLoading, error, refetch } = companyHooks.useList()
  const { data: users } = useOrgUsers()
  const del = companyHooks.useDelete()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Company | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [toDelete, setToDelete] = useState<Company | null>(null)

  const filtered = useMemo(() => {
    return (companies ?? []).filter((c) => {
      if (type && c.company_type !== type) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [companies, search, type])

  const columns: Column<Company>[] = [
    { key: 'name', header: 'Company', render: (c) => <span className="font-medium text-gray-100">{c.name}</span>, sortValue: (c) => c.name },
    { key: 'industry', header: 'Industry', render: (c) => c.industry ?? '—' },
    { key: 'location', header: 'Location', render: (c) => c.location ?? '—' },
    { key: 'type', header: 'Type', render: (c) => <Badge color="purple">{c.company_type.replace(/_/g, ' ')}</Badge> },
    { key: 'status', header: 'Status', render: (c) => <Badge color={statusColors[c.status]}>{c.status}</Badge> },
    { key: 'owner', header: 'Owner', render: (c) => userLabel(users, c.account_owner_id) },
  ]

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Clients, vendors, and partners you work with"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Company</Button>}
      />
      <Toolbar>
        <Input placeholder="Search companies…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[200px]">
          <option value="">All types</option>
          {['client', 'vendor', 'msp', 'staffing_company', 'direct_employer', 'partner'].map((t) => (
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
        onRowClick={(c) => navigate(`/companies/${c.id}`)}
        emptyTitle="No companies yet"
        emptyAction={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Company</Button>}
        rowActions={(c) => (
          <>
            <RowMenuItem onClick={() => navigate(`/companies/${c.id}`)}>View</RowMenuItem>
            <RowMenuItem onClick={() => { setEditing(c); setFormOpen(true) }}>Edit</RowMenuItem>
            <RowMenuItem danger onClick={() => setToDelete(c)}>Delete</RowMenuItem>
          </>
        )}
      />

      <CompanyForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} company={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete company"
        message={`Delete company "${toDelete?.name}"?`}
        danger
        confirmLabel="Delete"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await del.mutateAsync(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}
