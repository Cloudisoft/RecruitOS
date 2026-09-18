import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { projectHooks } from '../../lib/entities'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { TaskForm } from '../tasks/TaskForm'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

export function ProjectDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: project, isLoading, error, refetch } = projectHooks.useOne(id)
  const { data: users } = useOrgUsers()
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [addingMember, setAddingMember] = useState('')

  const tasksQ = useQuery({
    queryKey: ['project-tasks', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const membersQ = useQuery({
    queryKey: ['project-members', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('project_members').select('*').eq('project_id', id)
      if (error) throw error
      return data ?? []
    },
  })

  async function addMember() {
    if (!addingMember || !id) return
    const { error } = await supabase.from('project_members').insert({ project_id: id, user_id: addingMember })
    if (error) {
      toast.error(error.message)
      return
    }
    setAddingMember('')
    qc.invalidateQueries({ queryKey: ['project-members', id] })
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('project_members').delete().eq('id', memberId)
    if (error) {
      toast.error(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['project-members', id] })
  }

  if (isLoading) return <LoadingState />
  if (error || !project) return <ErrorState message={(error as Error)?.message ?? 'Project not found'} onRetry={refetch} />

  const memberIds = new Set((membersQ.data ?? []).map((m: any) => m.user_id))
  const availableUsers = users?.filter((u) => !memberIds.has(u.id))

  return (
    <div>
      <PageHeader title={project.name} description={project.description ?? undefined} />
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Tabs
            tabs={[
              {
                label: `Tasks (${(tasksQ.data ?? []).length})`,
                content: (
                  <div>
                    <div className="mb-3 flex justify-end">
                      <Button size="sm" onClick={() => setTaskFormOpen(true)}><Plus className="h-4 w-4" /> Add Task</Button>
                    </div>
                    {(tasksQ.data ?? []).length === 0 ? (
                      <EmptyState title="No tasks linked to this project yet" />
                    ) : (
                      <div className="space-y-2">
                        {tasksQ.data!.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3 text-sm">
                            <span className="text-gray-200">{t.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge color="orange">{t.priority}</Badge>
                              <Badge color="blue">{t.status.replace(/_/g, ' ')}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                label: 'Members',
                content: (
                  <div>
                    <div className="mb-3 flex gap-2">
                      <Select value={addingMember} onChange={(e) => setAddingMember(e.target.value)} className="max-w-xs">
                        <option value="">Add a member…</option>
                        {availableUsers?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                      </Select>
                      <Button size="sm" onClick={addMember} disabled={!addingMember}>Add</Button>
                    </div>
                    {(membersQ.data ?? []).length === 0 ? (
                      <EmptyState title="No members added yet" />
                    ) : (
                      <div className="space-y-2">
                        {membersQ.data!.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3 text-sm">
                            <span className="text-gray-200">{userLabel(users, m.user_id)}</span>
                            <button onClick={() => removeMember(m.id)} className="text-gray-500 hover:text-red-400"><X className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>

        <Card>
          <CardHeader><h3 className="font-medium text-gray-200">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Status"><Badge color="green">{project.status.replace(/_/g, ' ')}</Badge></Row>
            <Row label="Priority"><Badge color="orange">{project.priority}</Badge></Row>
            <Row label="Owner">{userLabel(users, project.owner_id)}</Row>
            <Row label="Start date">{project.start_date ?? '—'}</Row>
            <Row label="End date">{project.end_date ?? '—'}</Row>
          </CardBody>
        </Card>
      </div>

      <TaskForm
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); qc.invalidateQueries({ queryKey: ['project-tasks', id] }) }}
        defaultProjectId={id}
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1c1d24] pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{children}</span>
    </div>
  )
}
