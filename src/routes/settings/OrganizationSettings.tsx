import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'
import toast from 'react-hot-toast'

export function OrganizationSettings() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', profile?.org_id],
    enabled: !!profile?.org_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', profile!.org_id).single()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (org) setForm(org)
  }, [org])

  const isAdmin = profile?.role === 'admin' || profile?.role === 'global_admin'

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('organizations').update({
      name: form.name, address: form.address, phone: form.phone, email: form.email,
      timezone: form.timezone, currency: form.currency, date_format: form.date_format,
    }).eq('id', profile!.org_id)
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Organization settings saved')
    qc.invalidateQueries({ queryKey: ['organization'] })
  }

  if (isLoading) return <LoadingState />

  return (
    <div>
      <PageHeader title="Organization" description="Company-wide settings for your RecruitOS workspace" />
      <Card className="max-w-2xl">
        <CardBody className="grid grid-cols-2 gap-4">
          <Input label="Organization name" disabled={!isAdmin} value={form.name ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          <Input label="Email" disabled={!isAdmin} value={form.email ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" disabled={!isAdmin} value={form.phone ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          <Select label="Currency" disabled={!isAdmin} value={form.currency ?? 'USD'} onChange={(e) => setForm((f: any) => ({ ...f, currency: e.target.value }))}>
            {['USD', 'EUR', 'GBP', 'CAD', 'INR'].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Timezone" disabled={!isAdmin} value={form.timezone ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, timezone: e.target.value }))} />
          <Select label="Date format" disabled={!isAdmin} value={form.date_format ?? 'MM/DD/YYYY'} onChange={(e) => setForm((f: any) => ({ ...f, date_format: e.target.value }))}>
            {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
          <div className="col-span-2">
            <Input label="Address" disabled={!isAdmin} value={form.address ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} />
          </div>
          {isAdmin ? (
            <div className="col-span-2 flex justify-end">
              <Button onClick={save} loading={saving}>Save changes</Button>
            </div>
          ) : (
            <p className="col-span-2 text-sm text-gray-500">Only Admins can change organization settings.</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
