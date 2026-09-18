import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { StatusBadge } from '../../components/ui/Badge'
import { taskHooks } from '../../lib/entities'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import type { Task, TaskStatus } from '../../lib/domain'
import { Plus } from 'lucide-react'
import { TaskForm } from './TaskForm'
import { isPast, isToday } from 'date-fns'

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'to_do', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

export function TasksBoard() {
  const [params, setParams] = useSearchParams()
  const { data: tasks, isLoading, error, refetch } = taskHooks.useList()
  const { data: users } = useOrgUsers()
  const update = taskHooks.useUpdate()
  const [formOpen, setFormOpen] = useState(params.get('create') === '1')
  const [editing, setEditing] = useState<Task | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const c of columns) map.set(c.key, [])
    for (const t of tasks ?? []) map.get(t.status)?.push(t)
    return map
  }, [tasks])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />

  async function moveTo(status: TaskStatus) {
    if (!dragId) return
    await update.mutateAsync({ id: dragId, status } as any)
    setDragId(null)
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tasks"
        description="Jira-style task board across every module"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> New Task</Button>}
      />
      <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveTo(col.key)}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-[#22232b] bg-[#101116]"
          >
            <div className="flex items-center justify-between border-b border-[#1c1d24] px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{col.label}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">{grouped.get(col.key)?.length ?? 0}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {grouped.get(col.key)?.map((t) => {
                const overdue = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done'
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => { setEditing(t); setFormOpen(true) }}
                    className="cursor-grab rounded-lg border border-[#22232b] bg-[#16171d] p-3 active:cursor-grabbing hover:border-orange-500/40"
                  >
                    <p className="text-sm font-medium text-gray-100">{t.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusBadge status={t.priority} kind="priority" />
                      {t.due_date && <span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-500'}`}>{t.due_date}</span>}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-gray-600">{userLabel(users, t.assignee_id)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); params.delete('create'); setParams(params) }} task={editing} />
    </div>
  )
}
