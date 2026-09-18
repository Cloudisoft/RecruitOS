import { createClient } from '@supabase/supabase-js'

// NOTE: intentionally untyped (no generic Database schema) — this project
// hand-maintains domain types in `src/lib/domain.ts` instead of a generated
// schema, and Supabase's generic Database typing requires literal table
// key/row mappings to infer correctly; a loose structural stand-in makes
// every `.from(table)` call resolve to `never`, which is worse than no
// typing at all. Call sites cast results to the domain types they expect.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project') && anonKey !== 'your-anon-key')

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[RecruitOS] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
