import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { companyHooks } from '../../lib/entities'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { EntityTimeline } from '../../components/EntityTimeline'
import { useOrgUsers, userLabel } from '../../lib/useOrgUsers'

export function CompanyDetail() {
  const { id } = useParams()
  const { data: company, isLoading, error, refetch } = companyHooks.useOne(id)
  const { data: users } = useOrgUsers()

  const contactsQ = useQuery({
    queryKey: ['company-contacts', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('company_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const jobsQ = useQuery({
    queryKey: ['company-jobs', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('company_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const submissionsQ = useQuery({
    queryKey: ['company-submissions', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('company_id', id).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  if (isLoading) return <LoadingState />
  if (error || !company) return <ErrorState message={(error as Error)?.message ?? 'Company not found'} onRetry={refetch} />

  return (
    <div>
      <PageHeader title={company.name} description={company.industry ?? undefined} />
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Tabs
            tabs={[
              {
                label: 'Contacts',
                content: (contactsQ.data ?? []).length === 0
                  ? <EmptyState title="No contacts linked yet" />
                  : (
                    <div className="space-y-2">
                      {contactsQ.data!.map((c: any) => (
                        <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3 hover:border-orange-500/40">
                          <span className="text-sm text-gray-200">{c.first_name} {c.last_name} — {c.title ?? 'Contact'}</span>
                          <Badge color="blue">{c.contact_type.replace(/_/g, ' ')}</Badge>
                        </Link>
                      ))}
                    </div>
                  ),
              },
              {
                label: 'Open Jobs',
                content: (jobsQ.data ?? []).length === 0
                  ? <EmptyState title="No jobs from this company yet" />
                  : (
                    <div className="space-y-2">
                      {jobsQ.data!.map((j: any) => (
                        <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3 hover:border-orange-500/40">
                          <span className="text-sm text-gray-200">{j.title}</span>
                          <StatusBadge status={j.status} kind="job" />
                        </Link>
                      ))}
                    </div>
                  ),
              },
              {
                label: 'Submissions',
                content: (submissionsQ.data ?? []).length === 0
                  ? <EmptyState title="No submissions to this company yet" />
                  : (
                    <div className="space-y-2">
                      {submissionsQ.data!.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3">
                          <span className="text-sm text-gray-200">Bill ${s.bill_rate ?? '—'} / Pay ${s.pay_rate ?? '—'}</span>
                          <StatusBadge status={s.status} kind="submission" />
                        </div>
                      ))}
                    </div>
                  ),
              },
              {
                label: 'Timeline & Notes',
                content: <EntityTimeline entityType="company" entityId={company.id} />,
              },
            ]}
          />
        </div>

        <Card>
          <CardHeader><h3 className="font-medium text-gray-200">Details</h3></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <Row label="Status"><Badge color={company.status === 'active' ? 'green' : company.status === 'blacklisted' ? 'red' : 'blue'}>{company.status}</Badge></Row>
            <Row label="Type"><Badge color="purple">{company.company_type.replace(/_/g, ' ')}</Badge></Row>
            <Row label="Website">{company.website ? <a href={company.website} target="_blank" className="text-orange-400 hover:underline">{company.website}</a> : '—'}</Row>
            <Row label="Location">{company.location ?? '—'}</Row>
            <Row label="Company size">{company.company_size ?? '—'}</Row>
            <Row label="Owner">{userLabel(users, company.account_owner_id)}</Row>
            {company.description && <p className="pt-2 text-gray-400">{company.description}</p>}
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
