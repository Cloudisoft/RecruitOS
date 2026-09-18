import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import toast from 'react-hot-toast'

/**
 * Generic Supabase-backed CRUD hook factory. Every CRM list/detail page uses
 * this so create/update/delete all go through real DB writes with the same
 * loading/error/toast behavior, instead of each module reimplementing it.
 */
export function createEntityHooks<T extends { id: string }>(table: string, queryKey: string) {
  function useList(select = '*', filters?: (q: any) => any) {
    return useQuery({
      queryKey: [queryKey, 'list', filters?.toString()],
      queryFn: async () => {
        let q = supabase.from(table).select(select).order('created_at', { ascending: false })
        if (filters) q = filters(q)
        const { data, error } = await q
        if (error) throw error
        return (data ?? []) as unknown as T[]
      },
    })
  }

  function useOne(id: string | undefined, select = '*') {
    return useQuery({
      queryKey: [queryKey, 'one', id],
      enabled: !!id,
      queryFn: async () => {
        const { data, error } = await supabase.from(table).select(select).eq('id', id as string).single()
        if (error) throw error
        return data as unknown as T
      },
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (payload: Partial<T>) => {
        const { data, error } = await supabase.from(table).insert(payload as any).select().single()
        if (error) throw error
        return data as unknown as T
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [queryKey] })
        toast.success('Created successfully')
      },
      onError: (err: any) => toast.error(err.message ?? 'Failed to create'),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async ({ id, ...payload }: Partial<T> & { id: string }) => {
        const { data, error } = await supabase.from(table).update(payload as any).eq('id', id).select().single()
        if (error) throw error
        return data as unknown as T
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [queryKey] })
        toast.success('Updated successfully')
      },
      onError: (err: any) => toast.error(err.message ?? 'Failed to update'),
    })
  }

  function useDelete() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: async (id: string) => {
        const { data: userRes } = await supabase.auth.getUser()
        const { data: existing } = await supabase.from(table).select('*').eq('id', id).single()
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        if (userRes.user) {
          const { data: profileRow } = await supabase.from('users').select('org_id').eq('id', userRes.user.id).single()
          await supabase.from('audit_logs').insert({
            org_id: (profileRow as any)?.org_id,
            user_id: userRes.user.id,
            action: 'delete',
            entity_type: table,
            entity_id: id,
            old_data: existing ?? null,
          })
        }
        return id
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [queryKey] })
        toast.success('Deleted successfully')
      },
      onError: (err: any) => toast.error(err.message ?? 'Failed to delete'),
    })
  }

  return { useList, useOne, useCreate, useUpdate, useDelete }
}
