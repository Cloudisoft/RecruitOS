import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Input'
import type { AppUser, AppRole } from '../../lib/domain'
import toast from 'react-hot-toast'

export function TeamSettings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data: users, isLoading, error, refetch } = useOrgUsers()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'global_admin'
  const [updating, setUpdating] = useState<string | null>(null)

  async function changeRole(user: AppUser, role: AppRole) {
    setUpdating(user.id)
    const { error } = await supabase.from('users').update({ role }).eq('id', user.id)
    if (!error) {
      await supabase.from('audit_logs').insert({
        org_id: profile?.org_id,
        user_id: profile?.id,
        action: 'role_change',
        entity_type: 'users',
        entity_id: user.id,
        old_data: { role: user.role },
        new_data: { role },
      })
    }
    setUpdating(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${user.full_name || user.email} is now ${role.replace('_', ' ')}`)
    qc.invalidateQueries({ queryKey: ['org-users'] })
  }

  const columns: Column<AppUser>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-gray-900">{u.full_name || '—'}</span> },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'title', header: 'Title', render: (u) => u.title ?? '—' },
    {
      key: 'role', header: 'Role', render: (u) => isAdmin && u.id !== profile?.id ? (
        <Select value={u.role} disabled={updating === u.id} onChange={(e) => changeRole(u, e.target.value as AppRole)} className="max-w-[160px]">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          {profile?.role === 'global_admin' && <option value="global_admin">Global Admin</option>}
        </Select>
      ) : <Badge color="orange">{u.role.replace('_', ' ')}</Badge>,
    },
    { key: 'status', header: 'Status', render: (u) => <Badge color={u.is_active ? 'green' : 'gray'}>{u.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Team" description="Manage users and roles for your organization" />
      <DataTable columns={columns} rows={users ?? []} loading={isLoading} error={error ? (error as Error).message : null} onRetry={refetch} emptyTitle="No team members yet" />
    </div>
  )
}
