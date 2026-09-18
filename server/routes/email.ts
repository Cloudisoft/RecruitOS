import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { sendEmail, isEmailConfigured } from '../lib/email.js'

export const emailRouter = Router()

emailRouter.post('/send', async (req: AuthedRequest, res) => {
  const { to, subject, html, templateId, relatedEntityType, relatedEntityId } = req.body as {
    to?: string[]; subject?: string; html?: string; templateId?: string
    relatedEntityType?: string; relatedEntityId?: string
  }
  if (!to?.length || !subject || !html) {
    res.status(400).json({ error: 'to, subject, and html are required' })
    return
  }

  const result = await sendEmail({ to, subject, html })

  await supabaseAdmin.from('email_logs').insert({
    org_id: req.user!.org_id,
    template_id: templateId ?? null,
    to_addresses: to,
    subject,
    body_html: html,
    related_entity_type: relatedEntityType ?? null,
    related_entity_id: relatedEntityId ?? null,
    status: result.ok ? 'sent' : (isEmailConfigured ? 'failed' : 'not_configured'),
    error_message: result.ok ? null : result.error,
    sent_by: req.user!.id,
  })

  if (!result.ok) {
    res.status(isEmailConfigured ? 502 : 503).json({ error: result.error })
    return
  }
  res.json({ ok: true })
})
