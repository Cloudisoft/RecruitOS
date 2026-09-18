import type { NextFunction, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

export interface AuthedRequest extends Request {
  user?: {
    id: string
    org_id: string
    role: 'user' | 'admin' | 'global_admin'
    email: string
  }
}

/**
 * Verifies the Supabase access token sent by the frontend (Authorization:
 * Bearer <token>) and attaches the caller's profile (org_id, role) to the
 * request. Every AI/email route uses this instead of trusting client-sent
 * org_id/user_id — RBAC and org scoping are enforced server-side here, the
 * same way Postgres RLS enforces it for direct DB access.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, org_id, role, email')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) {
    res.status(403).json({ error: 'No organization profile found for this user' })
    return
  }

  req.user = profile as AuthedRequest['user']
  next()
}

export function requireRole(...roles: Array<'user' | 'admin' | 'global_admin'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
