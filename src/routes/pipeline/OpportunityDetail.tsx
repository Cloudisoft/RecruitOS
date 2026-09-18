import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { opportunityHooks, companyHooks, contactHooks } from '../../lib/entities'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EntityTimeline } from '../../components/EntityTimeline'
import { OpportunityForm } from './OpportunityForm'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'
import { Pencil } from 'lucide-react'

export function OpportunityDetail() {
  const { id } = useParams()
  const { data: opp, isLoading, error, refetch } = opportunityHooks.useOne(id)
  const { data: companies } = companyHooks.useList('id,name')
  const { data: contacts } = contactHooks.useList('id,first_name,last_name')
  const { data: users } = useOrgUsers()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <LoadingState />
  if (error || !opp) return <ErrorState message={(error as Error)?.message ?? 'Opportunity not found'} onRetry={refetch} />

  const company = companies?.find((c) => c.id === opp.company_id)
  const contact = contacts?.find((c: any) => c.id === opp.contact_id)

  return (
    <div>
      <PageHeader
        title={opp.name}
        description={company?.name}
        actions={<Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
      />
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2">
          <CardHeader><h3 className="font-medium text-gray-800">Timeline & Notes</h3></CardHeader>
          <CardBody><EntityTimeline entityType="opportunity" entityId={opp.id} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-medium text-gray-800">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Stage"><Badge color="orange">{opp.stage.replace(/_/g, ' ')}</Badge></Row>
            <Row label="Estimated value">${Number(opp.estimated_value).toLocaleString()}</Row>
            <Row label="Probability">{opp.probability}%</Row>
            <Row label="Contact">{contact ? `${contact.first_name} ${contact.last_name}` : '—'}</Row>
            <Row label="Expected close">{opp.expected_close_date ?? '—'}</Row>
            <Row label="Owner">{userLabel(users, opp.owner_id)}</Row>
          </CardBody>
        </Card>
      </div>
      <OpportunityForm open={editOpen} onClose={() => setEditOpen(false)} opportunity={opp} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{children}</span>
    </div>
  )
}
