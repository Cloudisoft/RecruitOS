import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { LoadingState, ErrorState } from '../components/ui/States'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Target, UserSquare2, Briefcase, SendHorizonal, Award, ListTodo, TrendingUp, Megaphone,
} from 'lucide-react'

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444']

async function count(table: string, filter?: (q: any) => any) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count: c, error } = await q
  if (error) throw error
  return c ?? 0
}

export function Dashboard() {
  const kpisQuery = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const [
        totalLeads, newLeads, qualifiedLeads, activeOpportunities, activeBench,
        marketingCandidates, resumesSent, activeSubmissions, placements, pendingTasks,
      ] = await Promise.all([
        count('leads'),
        count('leads', (q) => q.eq('status', 'new')),
        count('leads', (q) => q.eq('status', 'qualified')),
        count('opportunities', (q) => q.not('stage', 'in', '(closed_won,closed_lost)')),
        count('candidates', (q) => q.eq('bench_status', 'active_bench')),
        count('candidates', (q) => q.eq('bench_status', 'marketing')),
        count('marketing_activities', (q) => q.eq('resume_sent', true)),
        count('submissions', (q) => q.not('status', 'in', '(withdrawn,rejected,placed)')),
        count('placements'),
        count('tasks', (q) => q.not('status', 'in', '(done)')),
      ])
      return { totalLeads, newLeads, qualifiedLeads, activeOpportunities, activeBench, marketingCandidates, resumesSent, activeSubmissions, placements, pendingTasks }
    },
  })

  const leadFunnelQuery = useQuery({
    queryKey: ['dashboard-lead-funnel'],
    queryFn: async () => {
      const statuses = ['new', 'contacted', 'qualified', 'nurturing', 'sales_opportunity', 'converted']
      const results = await Promise.all(statuses.map((s) => count('leads', (q) => q.eq('status', s))))
      return statuses.map((s, i) => ({ name: s.replace(/_/g, ' '), value: results[i] }))
    },
  })

  const candidatePipelineQuery = useQuery({
    queryKey: ['dashboard-candidate-pipeline'],
    queryFn: async () => {
      const statuses = ['new', 'screening', 'ready_to_market', 'marketing', 'submitted', 'interviewing', 'offer', 'placed']
      const results = await Promise.all(statuses.map((s) => count('candidates', (q) => q.eq('status', s))))
      return statuses.map((s, i) => ({ name: s.replace(/_/g, ' '), value: results[i] }))
    },
  })

  const submissionStatusQuery = useQuery({
    queryKey: ['dashboard-submission-status'],
    queryFn: async () => {
      const statuses = ['submitted', 'client_reviewing', 'shortlisted', 'interview', 'offer', 'placed', 'rejected']
      const results = await Promise.all(statuses.map((s) => count('submissions', (q) => q.eq('status', s))))
      return statuses.map((s, i) => ({ name: s.replace(/_/g, ' '), value: results[i] })).filter((r) => r.value > 0)
    },
  })

  if (kpisQuery.isLoading) return <LoadingState label="Loading dashboard…" />
  if (kpisQuery.error) return <ErrorState message={(kpisQuery.error as Error).message} onRetry={() => kpisQuery.refetch()} />

  const k = kpisQuery.data!

  const kpis = [
    { label: 'Total Leads', value: k.totalLeads, icon: Target },
    { label: 'New Leads', value: k.newLeads, icon: Target },
    { label: 'Qualified Leads', value: k.qualifiedLeads, icon: Target },
    { label: 'Active Opportunities', value: k.activeOpportunities, icon: TrendingUp },
    { label: 'Active Bench', value: k.activeBench, icon: UserSquare2 },
    { label: 'Being Marketed', value: k.marketingCandidates, icon: Megaphone },
    { label: 'Resumes Sent', value: k.resumesSent, icon: SendHorizonal },
    { label: 'Active Submissions', value: k.activeSubmissions, icon: Briefcase },
    { label: 'Placements', value: k.placements, icon: Award },
    { label: 'Pending Tasks', value: k.pendingTasks, icon: ListTodo },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" description="Live overview of your recruitment and bench sales pipeline" />

      <div className="mb-6 grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardBody className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-400"><kpi.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xl font-semibold text-gray-100">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Lead Funnel</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadFunnelQuery.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22232b" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#16171d', border: '1px solid #26272f', fontSize: 12 }} />
                <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Candidate Pipeline</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={candidatePipelineQuery.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22232b" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#16171d', border: '1px solid #26272f', fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="col-span-2">
          <CardBody>
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Submission Funnel</h3>
            {(submissionStatusQuery.data ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No submissions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={submissionStatusQuery.data} dataKey="value" nameKey="name" outerRadius={90} label>
                    {(submissionStatusQuery.data ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#16171d', border: '1px solid #26272f', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
