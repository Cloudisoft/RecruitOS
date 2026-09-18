import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { AppUser } from './domain'

export function useOrgUsers() {
  return useQuery({
    queryKey: ['org-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('full_name')
      if (error) throw error
      return (data ?? []) as unknown as AppUser[]
    },
  })
}

export function userLabel(users: AppUser[] | undefined, id: string | null | undefined) {
  if (!id) return '—'
  const u = users?.find((u) => u.id === id)
  return u?.full_name || u?.email || '—'
}
