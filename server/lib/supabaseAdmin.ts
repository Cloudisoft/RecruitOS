import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isSupabaseAdminConfigured = Boolean(url && serviceRoleKey)

if (!isSupabaseAdminConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[server] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — server-side Supabase calls will fail.')
}

/**
 * Service-role client for server-side use only. Bypasses RLS, so every
 * caller in this codebase must scope queries by org_id itself (taken from
 * the verified JWT in requireAuth, never from client-supplied input).
 */
export const supabaseAdmin = createClient(url || 'https://placeholder.supabase.co', serviceRoleKey || 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false },
})
