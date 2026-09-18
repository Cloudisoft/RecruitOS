import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const entities = ['candidate', 'submission', 'lead', 'opportunity', 'job', 'offer', 'background_check', 'placement', 'interview']
const actionTypes = ['create_task', 'send_notification', 'set_candidate_field', 'set_submission_field']

interface ActionRow {
  id: string
  action_type: string
  params: Record<string, string>
}

export function AutomationForm({ open, onClose, automationId }: { open: boolean; onClose: () => void; automationId?: string | null }) {
  const { profile } = useAuth()
  const { data: users } = useOrgUsers()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEntity, setTriggerEntity] = useState('candidate')
  const [toValue, setToValue] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [actions, setActions] = useState<ActionRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!automationId) {
      setName(''); setDescription(''); setTriggerEntity('candidate'); setToValue(''); setIsActive(true)
      setActions([{ id: crypto.randomUUID(), action_type: 'create_task', params: {} }])
      return
    }
    ;(async () => {
      const { data: automation } = await supabase.from('automations').select('*').eq('id', automationId).single()
      const { data: actionRows } = await supabase.from('automation_actions').select('*').eq('automation_id', automationId).order('position')
      if (automation) {
        setName(automation.name)
        setDescription(automation.description ?? '')
        setTriggerEntity(automation.trigger_entity)
        setToValue(automation.trigger_condition?.to_value ?? '')
        setIsActive(automation.is_active)
      }
      setActions((actionRows ?? []).map((a: any) => ({ id: a.id, action_type: a.action_type, params: a.action_params })))
    })()
  }, [automationId, open])

  function addAction() {
    setActions((a) => [...a, { id: crypto.randomUUID(), action_type: 'create_task', params: {} }])
  }
  function updateAction(id: string, patch: Partial<ActionRow>) {
    setActions((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  function updateParam(id: string, key: string, value: string) {
    setActions((a) => a.map((x) => (x.id === id ? { ...x, params: { ...x.params, [key]: value } } : x)))
  }
  function removeAction(id: string) {
    setActions((a) => a.filter((x) => x.id !== id))
  }

  async function submit() {
    if (!name || !profile) return
    setSaving(true)
    try {
      let id = automationId
      const payload = {
        org_id: profile.org_id,
        name,
        description: description || null,
        trigger_entity: triggerEntity,
        trigger_event: 'status_changed',
        trigger_condition: toValue ? { to_value: toValue } : {},
        is_active: isActive,
        created_by: profile.id,
      }
      if (id) {
        const { error } = await supabase.from('automations').update(payload).eq('id', id)
        if (error) throw error
        await supabase.from('automation_actions').delete().eq('automation_id', id)
      } else {
        const { data, error } = await supabase.from('automations').insert(payload).select().single()
        if (error) throw error
        id = data.id
      }
      if (actions.length > 0) {
        const { error } = await supabase.from('automation_actions').insert(
          actions.map((a, i) => ({ automation_id: id, action_type: a.action_type, action_params: a.params, position: i }))
        )
        if (error) throw error
      }
      toast.success('Automation saved')
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={automationId ? 'Edit Automation' : 'New Automation'} size="xl" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!name}>Save automation</Button>
      </>
    }>
      <div className="space-y-4">
        <Input label="Automation name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ready to Market -> notify marketing team" />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="rounded-lg border border-[#22232b] bg-[#101116] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">When</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Entity" value={triggerEntity} onChange={(e) => setTriggerEntity(e.target.value)}>
              {entities.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
            <Input label="Status changes to (leave blank for any change)" value={toValue} onChange={(e) => setToValue(e.target.value)} placeholder="e.g. ready_to_market" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Then</p>
            <Button size="sm" variant="secondary" onClick={addAction}><Plus className="h-4 w-4" /> Add action</Button>
          </div>
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="rounded-lg border border-[#22232b] bg-[#101116] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Select value={action.action_type} onChange={(e) => updateAction(action.id, { action_type: e.target.value, params: {} })} className="max-w-xs">
                    {actionTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </Select>
                  <button onClick={() => removeAction(action.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
                {action.action_type === 'create_task' && (
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Task title" value={action.params.title ?? ''} onChange={(e) => updateParam(action.id, 'title', e.target.value)} />
                    <Select value={action.params.assignee_id ?? ''} onChange={(e) => updateParam(action.id, 'assignee_id', e.target.value)}>
                      <option value="">Unassigned</option>
                      {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </Select>
                    <Input type="number" placeholder="Due in N days" value={action.params.due_in_days ?? ''} onChange={(e) => updateParam(action.id, 'due_in_days', e.target.value)} />
                  </div>
                )}
                {action.action_type === 'send_notification' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={action.params.user_id ?? ''} onChange={(e) => updateParam(action.id, 'user_id', e.target.value)}>
                      <option value="">Select recipient</option>
                      {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </Select>
                    <Input placeholder="Notification title" value={action.params.title ?? ''} onChange={(e) => updateParam(action.id, 'title', e.target.value)} />
                  </div>
                )}
                {action.action_type === 'set_candidate_field' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={action.params.field ?? ''} onChange={(e) => updateParam(action.id, 'field', e.target.value)}>
                      <option value="">Field…</option>
                      <option value="status">status</option>
                      <option value="bench_status">bench_status</option>
                      <option value="marketing_owner_id">marketing_owner_id</option>
                    </Select>
                    {action.params.field === 'marketing_owner_id' ? (
                      <Select value={action.params.value ?? ''} onChange={(e) => updateParam(action.id, 'value', e.target.value)}>
                        <option value="">Select user</option>
                        {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                      </Select>
                    ) : (
                      <Input placeholder="New value" value={action.params.value ?? ''} onChange={(e) => updateParam(action.id, 'value', e.target.value)} />
                    )}
                  </div>
                )}
                {action.action_type === 'set_submission_field' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={action.params.field ?? 'status'} onChange={(e) => updateParam(action.id, 'field', e.target.value)}>
                      <option value="status">status</option>
                    </Select>
                    <Input placeholder="New value" value={action.params.value ?? ''} onChange={(e) => updateParam(action.id, 'value', e.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
