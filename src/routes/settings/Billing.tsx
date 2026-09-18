import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/States'
import { AlertTriangle } from 'lucide-react'

async function count(table: string) {
  const { count: c, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return c ?? 0
}

export function Billing() {
  const usageQ = useQuery({
    queryKey: ['billing-usage'],
    queryFn: async () => {
      const [users, candidates, documents, docSizeRows] = await Promise.all([
        count('users'),
        count('candidates'),
        count('candidate_documents'),
        supabase.from('candidate_documents').select('file_size'),
      ])
      const storageBytes = (docSizeRows.data ?? []).reduce((sum, r: any) => sum + Number(r.file_size ?? 0), 0)
      return { users, candidates, documents, storageBytes }
    },
  })

  if (usageQ.isLoading) return <LoadingState />
  const u = usageQ.data!

  return (
    <div>
      <PageHeader title="Billing" description="Plan and usage for your organization" />

      <Card className="mb-5">
        <CardHeader><h3 className="font-medium text-gray-200">Current Plan</h3></CardHeader>
        <CardBody className="flex items-center justify-between">
          <div>
            <Badge color="orange">Self-Hosted / Free</Badge>
            <p className="mt-2 text-sm text-gray-500">This deployment is not connected to a payment provider yet.</p>
          </div>
        </CardBody>
      </Card>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <Card><CardBody><p className="text-xs text-gray-500">Users</p><p className="text-xl font-semibold text-gray-100">{u.users}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-gray-500">Candidates</p><p className="text-xl font-semibold text-gray-100">{u.candidates}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-gray-500">Documents Stored</p><p className="text-xl font-semibold text-gray-100">{u.documents} ({(u.storageBytes / 1024 / 1024).toFixed(1)} MB)</p></CardBody></Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p>AI usage metering and billing history are not implemented — this build doesn't track OpenAI token spend per organization.</p>
          <p className="mt-1">The architecture is modular: a Stripe (or other provider) integration can be added to the backend without changing how this page reads usage.</p>
        </div>
      </div>
    </div>
  )
}
