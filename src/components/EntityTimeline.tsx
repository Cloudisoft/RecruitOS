import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/Button'
import { Textarea } from './ui/Input'
import { formatDistanceToNow } from 'date-fns'
import { StickyNote, Activity as ActivityIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export function EntityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const notesQuery = useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const activitiesQuery = useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  async function addNote() {
    if (!note.trim()) return
    setSaving(true)
    const { error } = await supabase.from('notes').insert({
      entity_type: entityType,
      entity_id: entityId,
      body: note.trim(),
      org_id: profile?.org_id,
      author_id: profile?.id,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setNote('')
    qc.invalidateQueries({ queryKey: ['notes', entityType, entityId] })
    toast.success('Note added')
  }

  type TimelineEntry = { id: string; kind: 'note' | 'activity'; created_at: string; body?: string; summary?: string }
  const combined: TimelineEntry[] = [
    ...((notesQuery.data ?? []) as any[]).map((n) => ({ id: n.id, kind: 'note' as const, created_at: n.created_at, body: n.body })),
    ...((activitiesQuery.data ?? []) as any[]).map((a) => ({ id: a.id, kind: 'activity' as const, created_at: a.created_at, summary: a.summary })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="flex-1"
        />
        <Button onClick={addNote} loading={saving} className="h-fit self-end">Add note</Button>
      </div>

      {combined.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No activity yet</p>}

      <div className="space-y-3">
        {combined.map((item) => (
          <div key={item.kind + item.id} className="flex gap-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div className="mt-0.5 shrink-0 text-gray-500">
              {item.kind === 'note' ? <StickyNote className="h-4 w-4" /> : <ActivityIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800">{item.kind === 'note' ? item.body : item.summary}</p>
              <p className="mt-1 text-xs text-gray-600">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
