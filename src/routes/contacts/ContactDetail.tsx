import { useParams } from 'react-router-dom'
import { contactHooks, companyHooks } from '../../lib/entities'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EntityTimeline } from '../../components/EntityTimeline'

export function ContactDetail() {
  const { id } = useParams()
  const { data: contact, isLoading, error, refetch } = contactHooks.useOne(id)
  const { data: companies } = companyHooks.useList('id,name')

  if (isLoading) return <LoadingState />
  if (error || !contact) return <ErrorState message={(error as Error)?.message ?? 'Contact not found'} onRetry={refetch} />

  const company = companies?.find((c) => c.id === contact.company_id)

  return (
    <div>
      <PageHeader title={`${contact.first_name} ${contact.last_name}`} description={contact.title ?? undefined} />
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2">
          <CardHeader><h3 className="font-medium text-gray-200">Timeline & Notes</h3></CardHeader>
          <CardBody><EntityTimeline entityType="contact" entityId={contact.id} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-medium text-gray-200">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Type"><Badge color="blue">{contact.contact_type.replace(/_/g, ' ')}</Badge></Row>
            <Row label="Company">{company?.name ?? '—'}</Row>
            <Row label="Email">{contact.email ?? '—'}</Row>
            <Row label="Phone">{contact.phone ?? '—'}</Row>
            <Row label="Location">{contact.location ?? '—'}</Row>
            <Row label="LinkedIn">{contact.linkedin_url ? <a href={contact.linkedin_url} target="_blank" className="text-orange-400 hover:underline">Profile</a> : '—'}</Row>
          </CardBody>
        </Card>
      </div>
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
