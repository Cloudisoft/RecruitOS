import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const fromAddress = process.env.EMAIL_FROM_ADDRESS

export const isEmailConfigured = Boolean(apiKey && fromAddress)

if (!isEmailConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[server] RESEND_API_KEY / EMAIL_FROM_ADDRESS not set — email sending will report "not configured".')
}

const resend = apiKey ? new Resend(apiKey) : null

export async function sendEmail(opts: { to: string[]; subject: string; html: string }) {
  if (!resend || !fromAddress) {
    return { ok: false as const, error: 'Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS.' }
  }
  try {
    const { error } = await resend.emails.send({ from: fromAddress, to: opts.to, subject: opts.subject, html: opts.html })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  } catch (e: any) {
    return { ok: false as const, error: e.message ?? 'Failed to send email' }
  }
}
