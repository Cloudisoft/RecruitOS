import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const channels = ['resume_blast', 'email', 'linkedin', 'vendor', 'client', 'recruiter_outreach', 'job_matching', 'follow_up']
const responses = ['interested', 'requirement_received', 'asked_for_resume', 'interview', 'not_interested', 'no_response', 'follow_up_required']

export function CandidateMarketing({ candidateId }: { candidateId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ channel: 'email', notes: '', response: '' as string, resume_sent: false })

  const activitiesQ = useQuery({
    queryKey: ['candidate-marketing', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from('marketing_activities').select('*').eq('candidate_id', candidateId).order('activity_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  async function logActivity() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('marketing_activities').insert({
      org_id: profile.org_id,
      candidate_id: candidateId,
      channel: form.channel,
      notes: form.notes || null,
      response: form.response || null,
      resume_sent: form.resume_sent,
      recruiter_id: profile.id,
      created_by: profile.id,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Marketing activity logged')
    setOpen(false)
    setForm({ channel: 'email', notes: '', response: '', resume_sent: false })
    qc.invalidateQueries({ queryKey: ['candidate-marketing', candidateId] })
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Log Marketing Activity</Button>
      </div>

      {(activitiesQ.data ?? []).length === 0 ? (
        <EmptyState title="No marketing activity yet" description="Log resume blasts, vendor outreach, and follow-ups for this candidate." />
      ) : (
        <div className="space-y-2">
          {activitiesQ.data!.map((m: any) => (
            <div key={m.id} className="rounded-lg border border-[#22232b] bg-[#101116] p-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge color="blue">{m.channel.replace(/_/g, ' ')}</Badge>
                {m.response && <Badge color="orange">{m.response.replace(/_/g, ' ')}</Badge>}
              </div>
              {m.notes && <p className="mt-2 text-gray-400">{m.notes}</p>}
              <p className="mt-1 text-xs text-gray-600">{new Date(m.activity_date).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log Marketing Activity" footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={logActivity} loading={saving}>Log activity</Button>
        </>
      }>
        <div className="space-y-4">
          <Select label="Channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
            {channels.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select label="Response" value={form.response} onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}>
            <option value="">No response yet</option>
            {responses.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.resume_sent} onChange={(e) => setForm((f) => ({ ...f, resume_sent: e.target.checked }))} />
            Resume sent
          </label>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
