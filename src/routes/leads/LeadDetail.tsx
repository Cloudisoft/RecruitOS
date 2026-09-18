import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { leadHooks } from '../../lib/entities'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { EntityTimeline } from '../../components/EntityTimeline'
import { Modal } from '../../components/ui/Modal'
import { ArrowLeftRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

export function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data: lead, isLoading, error, refetch } = leadHooks.useOne(id)
  const [converting, setConverting] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  if (isLoading) return <LoadingState />
  if (error || !lead) return <ErrorState message={(error as Error)?.message ?? 'Lead not found'} onRetry={refetch} />

  async function doConvert() {
    if (!lead || !profile) return
    setConverting(true)
    try {
      const { data: company, error: companyErr } = lead.company
        ? await supabase.from('companies').insert({
            org_id: profile.org_id, name: lead.company, account_owner_id: lead.owner_id,
            status: 'prospect', company_type: 'client', created_by: profile.id,
          }).select().single()
        : { data: null, error: null }
      if (companyErr) throw companyErr

      const { data: contact, error: contactErr } = await supabase.from('contacts').insert({
        org_id: profile.org_id, first_name: lead.first_name, last_name: lead.last_name,
        title: lead.job_title, email: lead.email, phone: lead.phone, linkedin_url: lead.linkedin_url,
        location: lead.location, contact_type: 'client', company_id: company?.id ?? null,
        owner_id: lead.owner_id, created_by: profile.id,
      }).select().single()
      if (contactErr) throw contactErr

      const { data: opportunity, error: oppErr } = await supabase.from('opportunities').insert({
        org_id: profile.org_id, name: `${lead.company || lead.last_name} Opportunity`,
        company_id: company?.id ?? null, contact_id: contact.id, owner_id: lead.owner_id,
        stage: 'new_opportunity', source: lead.source, lead_id: lead.id, created_by: profile.id,
      }).select().single()
      if (oppErr) throw oppErr

      await supabase.from('leads').update({
        status: 'converted',
        converted_contact_id: contact.id,
        converted_company_id: company?.id ?? null,
        converted_opportunity_id: opportunity.id,
      }).eq('id', lead.id)

      toast.success('Lead converted to Contact, Company, and Opportunity')
      qc.invalidateQueries({ queryKey: ['leads'] })
      setConvertOpen(false)
      navigate(`/pipeline`)
    } catch (e: any) {
      toast.error(e.message ?? 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`${lead.first_name} ${lead.last_name}`}
        description={lead.job_title ? `${lead.job_title} at ${lead.company ?? '—'}` : lead.company ?? ''}
        actions={
          lead.status !== 'converted' ? (
            <Button onClick={() => setConvertOpen(true)}><ArrowLeftRight className="h-4 w-4" /> Convert Lead</Button>
          ) : <StatusBadge status="converted" kind="lead" />
        }
      />

      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2">
          <CardHeader><h3 className="font-medium text-gray-200">Timeline & Notes</h3></CardHeader>
          <CardBody>
            <EntityTimeline entityType="lead" entityId={lead.id} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-medium text-gray-200">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Status"><StatusBadge status={lead.status} kind="lead" /></Row>
            <Row label="Priority"><StatusBadge status={lead.priority} kind="priority" /></Row>
            <Row label="Source">{lead.source.replace(/_/g, ' ')}</Row>
            <Row label="Email">{lead.email ?? '—'}</Row>
            <Row label="Phone">{lead.phone ?? '—'}</Row>
            <Row label="LinkedIn">{lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" className="text-orange-400 hover:underline">Profile</a> : '—'}</Row>
            <Row label="Location">{lead.location ?? '—'}</Row>
            <Row label="Industry">{lead.industry ?? '—'}</Row>
            <Row label="Technology">{lead.technology ?? '—'}</Row>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert Lead"
        footer={<>
          <Button variant="secondary" onClick={() => setConvertOpen(false)}>Cancel</Button>
          <Button onClick={doConvert} loading={converting}>Convert</Button>
        </>}
      >
        <p className="text-sm text-gray-300">
          This will create a Contact{lead.company ? ', a Company,' : ''} and a Sales Opportunity from this lead's data,
          and mark the lead as Converted.
        </p>
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1c1d24] pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{children}</span>
    </div>
  )
}
