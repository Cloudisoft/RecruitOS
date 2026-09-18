import { Router } from 'express'
import { isAIConfigured, activeProvider } from '../lib/ai.js'
import { isEmailConfigured } from '../lib/email.js'
import { isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js'

export const statusRouter = Router()

statusRouter.get('/', (_req, res) => {
  res.json({
    openai: isAIConfigured, // kept as `openai` for frontend backwards-compat; reflects whichever provider is active
    aiProvider: activeProvider,
    email: isEmailConfigured,
    supabaseAdmin: isSupabaseAdminConfigured,
  })
})
