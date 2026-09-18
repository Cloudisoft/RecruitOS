import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface Notif {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export function NotificationsBell() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('id,title,body,is_read,created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data as unknown as Notif[]) ?? [])
  }

  useEffect(() => {
    load()
    if (!profile) return
    const channel = supabase
      .channel('notifications-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((i) => !i.is_read).length

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile?.id).eq('is_read', false)
    load()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-[#26272f] bg-[#16171d] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#22232b] px-3 py-2">
            <span className="text-sm font-medium text-gray-200">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-orange-400 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-gray-500">No notifications yet</p>}
            {items.map((n) => (
              <div key={n.id} className={`border-b border-[#1c1d24] px-3 py-2.5 ${!n.is_read ? 'bg-orange-500/5' : ''}`}>
                <p className="text-sm text-gray-200">{n.title}</p>
                {n.body && <p className="text-xs text-gray-500">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-gray-600">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
