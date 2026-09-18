import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export function AuditLogs() {
  const { data: users } = useOrgUsers()
  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return (data ?? []) as AuditLog[]
    },
  })

  const columns: Column<AuditLog>[] = [
    { key: 'action', header: 'Action', render: (l) => <Badge color="blue">{l.action}</Badge> },
    { key: 'entity', header: 'Entity', render: (l) => l.entity_type ? `${l.entity_type} ${l.entity_id?.slice(0, 8) ?? ''}` : '—' },
    { key: 'user', header: 'User', render: (l) => userLabel(users, l.user_id) },
    { key: 'time', header: 'Timestamp', render: (l) => format(new Date(l.created_at), 'MMM d, yyyy h:mm a'), sortValue: (l) => l.created_at },
  ]

  return (
    <div>
      <PageHeader title="Audit Logs" description="Admin-only record of important changes across your organization" />
      <DataTable
        columns={columns}
        rows={logs ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        emptyTitle="No audit activity recorded yet"
        emptyDescription="Audit entries are created automatically as your team creates, updates, and deletes records."
      />
    </div>
  )
}
