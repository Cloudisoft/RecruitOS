import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { emailTemplateHooks } from '../../lib/entities'
import { useAuth } from '../../contexts/AuthContext'
import type { EmailTemplate } from '../../lib/domain'

const categories = [
  'candidate_marketing', 'resume_submission', 'interview_confirmation', 'interview_follow_up',
  'offer_follow_up', 'client_follow_up', 'placement_confirmation', 'other',
]

export function EmailTemplateForm({ open, onClose, template }: { open: boolean; onClose: () => void; template?: EmailTemplate | null }) {
  const { profile } = useAuth()
  const create = emailTemplateHooks.useCreate()
  const update = emailTemplateHooks.useUpdate()
  const [form, setForm] = useState<Partial<EmailTemplate>>({})

  useEffect(() => {
    setForm(template ?? { name: '', category: 'other', subject: '', body_html: '' })
  }, [template, open])

  function set<K extends keyof EmailTemplate>(key: K, value: EmailTemplate[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name || !form.subject || !form.body_html) return
    if (template) await update.mutateAsync({ id: template.id, ...form } as any)
    else await create.mutateAsync({ ...form, org_id: profile?.org_id, created_by: profile?.id } as any)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={template ? 'Edit Email Template' : 'New Email Template'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.name || !form.subject || !form.body_html}>{template ? 'Save changes' : 'Create template'}</Button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Template name" required value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        <Select label="Category" value={form.category ?? 'other'} onChange={(e) => set('category', e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </Select>
        <div className="col-span-2">
          <Input label="Subject" required value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Textarea label="Body (HTML)" required value={form.body_html ?? ''} onChange={(e) => set('body_html', e.target.value)} className="min-h-[200px] font-mono text-xs" />
        </div>
      </div>
    </Modal>
  )
}
