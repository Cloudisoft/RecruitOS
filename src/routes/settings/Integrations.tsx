import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/apiClient'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/States'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Bot, Mail, Database, CheckCircle2, XCircle } from 'lucide-react'

export function Integrations() {
  const statusQ = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => api.get<{ openai: boolean; aiProvider: 'openai' | 'anthropic'; email: boolean; supabaseAdmin: boolean }>('/status'),
  })

  if (statusQ.isLoading) return <LoadingState />

  const rows = [
    {
      icon: Database,
      name: 'Application Database',
      configured: isSupabaseConfigured,
      description: 'Core data storage — required for the app to function at all.',
    },
    {
      icon: Database,
      name: 'Server Database Access',
      configured: statusQ.data?.supabaseAdmin ?? false,
      description: 'Required for Resume AI, Copilot, and AI matching to read/write on the server.',
    },
    {
      icon: Bot,
      name: 'AI Engine',
      configured: statusQ.data?.openai ?? false,
      description: 'Powers Resume AI (parse/analyze/enhance/generate), AI Copilot, and AI-enhanced candidate matching.',
    },
    {
      icon: Mail,
      name: 'Email Delivery',
      configured: statusQ.data?.email ?? false,
      description: 'Required to actually send email from the Email module and marketing campaigns.',
    },
  ]

  return (
    <div>
      <PageHeader title="Integrations" description="Live configuration status for this workspace" />
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.name}>
            <CardBody className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-black/5 p-2 text-gray-600"><r.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.description}</p>
                </div>
              </div>
              {r.configured ? (
                <Badge color="green"><span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span></Badge>
              ) : (
                <Badge color="red"><span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Not configured</span></Badge>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
