import { Router } from 'express'
import { isOpenAIConfigured } from '../lib/openai.js'
import { isEmailConfigured } from '../lib/email.js'
import { isSupabaseAdminConfigured } from '../lib/supabaseAdmin.js'

export const statusRouter = Router()

statusRouter.get('/', (_req, res) => {
  res.json({
    openai: isOpenAIConfigured,
    email: isEmailConfigured,
    supabaseAdmin: isSupabaseAdminConfigured,
  })
})
