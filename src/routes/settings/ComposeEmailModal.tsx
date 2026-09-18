import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { emailTemplateHooks } from '../../lib/entities'
import { api, ApiError } from '../../lib/apiClient'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export function ComposeEmailModal({ open, onClose, emailConfigured }: { open: boolean; onClose: () => void; emailConfigured: boolean }) {
  const { data: templates } = emailTemplateHooks.useList()
  const [templateId, setTemplateId] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) { setTemplateId(''); setTo(''); setSubject(''); setBody('') }
  }, [open])

  useEffect(() => {
    const t = templates?.find((t) => t.id === templateId)
    if (t) { setSubject(t.subject); setBody(t.body_html) }
  }, [templateId, templates])

  async function send() {
    const recipients = to.split(',').map((s) => s.trim()).filter(Boolean)
    if (recipients.length === 0 || !subject || !body) {
      toast.error('Recipient, subject, and body are required')
      return
    }
    setSending(true)
    try {
      await api.post('/email/send', { to: recipients, subject, html: body, templateId: templateId || undefined })
      toast.success('Email sent')
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose Email" size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={send} loading={sending}>Send</Button>
      </>
    }>
      {!emailConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No email provider is configured on the backend. Sending will fail until RESEND_API_KEY and EMAIL_FROM_ADDRESS are set — the attempt will still be logged.</span>
        </div>
      )}
      <div className="space-y-4">
        <Select label="Use template (optional)" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Blank email</option>
          {templates?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Input label="To (comma-separated emails)" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="jane@client.com, john@client.com" />
        <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Body (HTML)" required value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px] font-mono text-xs" />
      </div>
    </Modal>
  )
}
