import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageHeader, Toolbar } from '../../components/ui/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingState } from '../../components/ui/States'
import { DateRangeFilter, computeRange, type DateRangePreset } from '../../components/ui/DateRangeFilter'
import { useOrgUsers } from '../../lib/useOrgUsers'
import { exportToCsv } from '../../lib/csv'
import { benchAgeBucket, benchAgeDays } from '../../lib/benchAging'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'

function useRange() {
  const [range, setRange] = useState<{ preset: DateRangePreset; customStart?: string; customEnd?: string }>({ preset: 'last_30' })
  const computed = computeRange(range.preset, range.customStart, range.customEnd)
  return { range, setRange, computed }
}

function inRange(dateStr: string | null, computed: { start: Date | null; end: Date | null }) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (computed.start && d < computed.start) return false
  if (computed.end && d > computed.end) return false
  return true
}

export function Reports() {
  const { data: users } = useOrgUsers()
  const [recruiterFilter, setRecruiterFilter] = useState('')

  const leadsQ = useQuery({ queryKey: ['report-leads'], queryFn: async () => (await supabase.from('leads').select('*')).data ?? [] })
  const candidatesQ = useQuery({ queryKey: ['report-candidates'], queryFn: async () => (await supabase.from('candidates').select('*')).data ?? [] })
  const submissionsQ = useQuery({ queryKey: ['report-submissions'], queryFn: async () => (await supabase.from('submissions').select('*')).data ?? [] })
  const interviewsQ = useQuery({ queryKey: ['report-interviews'], queryFn: async () => (await supabase.from('interviews').select('*')).data ?? [] })
  const placementsQ = useQuery({ queryKey: ['report-placements'], queryFn: async () => (await supabase.from('placements').select('*')).data ?? [] })

  const loading = leadsQ.isLoading || candidatesQ.isLoading || submissionsQ.isLoading || interviewsQ.isLoading || placementsQ.isLoading
  if (loading) return <LoadingState label="Building reports…" />

  return (
    <div>
      <PageHeader title="Reports" description="Recruitment, bench, and sales performance — filterable and exportable" />
      <Toolbar>
        <Select value={recruiterFilter} onChange={(e) => setRecruiterFilter(e.target.value)} className="max-w-[220px]">
          <option value="">All recruiters</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </Select>
      </Toolbar>

      <Tabs
        tabs={[
          { label: 'Lead Conversion', content: <LeadConversionReport leads={leadsQ.data!} /> },
          { label: 'Bench Aging', content: <BenchAgingReport candidates={candidatesQ.data!} recruiterFilter={recruiterFilter} /> },
          { label: 'Submissions', content: <SubmissionsReport submissions={submissionsQ.data!} recruiterFilter={recruiterFilter} /> },
          { label: 'Interviews', content: <InterviewsReport interviews={interviewsQ.data!} /> },
          { label: 'Placements & Margin', content: <PlacementsReport placements={placementsQ.data!} recruiterFilter={recruiterFilter} /> },
          { label: 'Recruiter Performance', content: <RecruiterPerformanceReport candidates={candidatesQ.data!} submissions={submissionsQ.data!} placements={placementsQ.data!} users={users ?? []} /> },
        ]}
      />
    </div>
  )
}

function ReportCard({ title, onExport, children }: { title: string; onExport?: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          {onExport && <Button size="sm" variant="secondary" onClick={onExport}><Download className="h-3.5 w-3.5" /> Export CSV</Button>}
        </div>
        {children}
      </CardBody>
    </Card>
  )
}

function LeadConversionReport({ leads }: { leads: any[] }) {
  const { range, setRange, computed } = useRange()
  const filtered = leads.filter((l) => inRange(l.created_at, computed))
  const byStatus = useMemo(() => {
    const statuses = ['new', 'contacted', 'qualified', 'nurturing', 'sales_opportunity', 'converted', 'lost', 'closed']
    return statuses.map((s) => ({ name: s.replace(/_/g, ' '), value: filtered.filter((l) => l.status === s).length }))
  }, [filtered])
  const conversionRate = filtered.length ? ((filtered.filter((l) => l.status === 'converted').length / filtered.length) * 100).toFixed(1) : '0'

  return (
    <ReportCard title="Lead Conversion" onExport={() => exportToCsv('lead-conversion.csv', filtered.map((l) => ({ name: `${l.first_name} ${l.last_name}`, company: l.company, status: l.status, source: l.source, created_at: l.created_at })))}>
      <div className="mb-4"><DateRangeFilter value={range} onChange={setRange} /></div>
      <p className="mb-4 text-sm text-gray-600">Conversion rate: <span className="font-semibold text-green-600">{conversionRate}%</span> ({filtered.length} leads in range)</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byStatus}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ReportCard>
  )
}

function BenchAgingReport({ candidates, recruiterFilter }: { candidates: any[]; recruiterFilter: string }) {
  const filtered = candidates.filter((c) => !recruiterFilter || c.recruiter_owner_id === recruiterFilter)
  const buckets = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of filtered) {
      const bucket = benchAgeBucket(benchAgeDays(c.bench_start_date)).label
      counts[bucket] = (counts[bucket] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filtered])

  return (
    <ReportCard title="Bench Aging" onExport={() => exportToCsv('bench-aging.csv', filtered.map((c) => ({ name: `${c.first_name} ${c.last_name}`, bench_start_date: c.bench_start_date, days_on_bench: benchAgeDays(c.bench_start_date), status: c.status })))}>
      <p className="mb-4 text-sm text-gray-600">{filtered.length} candidates on bench</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
          <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="value" fill="#eab308" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ReportCard>
  )
}

function SubmissionsReport({ submissions, recruiterFilter }: { submissions: any[]; recruiterFilter: string }) {
  const { range, setRange, computed } = useRange()
  const filtered = submissions.filter((s) => inRange(s.submission_date, computed) && (!recruiterFilter || s.submitted_by === recruiterFilter))
  const byStatus = useMemo(() => {
    const statuses = ['submitted', 'resume_requested', 'client_reviewing', 'shortlisted', 'rejected', 'interview', 'offer', 'withdrawn', 'placed']
    return statuses.map((s) => ({ name: s.replace(/_/g, ' '), value: filtered.filter((x) => x.status === s).length })).filter((r) => r.value > 0)
  }, [filtered])

  return (
    <ReportCard title="Submission Report" onExport={() => exportToCsv('submissions.csv', filtered.map((s) => ({ id: s.id, status: s.status, bill_rate: s.bill_rate, pay_rate: s.pay_rate, submission_date: s.submission_date })))}>
      <div className="mb-4"><DateRangeFilter value={range} onChange={setRange} /></div>
      <p className="mb-4 text-sm text-gray-600">{filtered.length} submissions in range</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byStatus}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ReportCard>
  )
}

function InterviewsReport({ interviews }: { interviews: any[] }) {
  const { range, setRange, computed } = useRange()
  const filtered = interviews.filter((i) => inRange(i.scheduled_at, computed))
  const completed = filtered.filter((i) => i.status === 'completed').length
  const conversionRate = filtered.length ? ((completed / filtered.length) * 100).toFixed(1) : '0'

  return (
    <ReportCard title="Interview Conversion" onExport={() => exportToCsv('interviews.csv', filtered.map((i) => ({ id: i.id, type: i.interview_type, status: i.status, scheduled_at: i.scheduled_at, round: i.round })))}>
      <div className="mb-4"><DateRangeFilter value={range} onChange={setRange} /></div>
      <p className="text-sm text-gray-600">{filtered.length} interviews scheduled, {completed} completed ({conversionRate}%)</p>
    </ReportCard>
  )
}

function PlacementsReport({ placements, recruiterFilter }: { placements: any[]; recruiterFilter: string }) {
  const { range, setRange, computed } = useRange()
  const filtered = placements.filter((p) => inRange(p.placement_date, computed) && (!recruiterFilter || p.recruiter_id === recruiterFilter))
  const totalMargin = filtered.reduce((s, p) => s + Number(p.margin ?? 0), 0)

  return (
    <ReportCard title="Placement & Margin Report" onExport={() => exportToCsv('placements.csv', filtered.map((p) => ({ id: p.id, position: p.position, pay_rate: p.pay_rate, bill_rate: p.bill_rate, margin: p.margin, status: p.status, placement_date: p.placement_date })))}>
      <div className="mb-4"><DateRangeFilter value={range} onChange={setRange} /></div>
      <p className="text-sm text-gray-600">{filtered.length} placements, total margin <span className="font-semibold text-green-600">${totalMargin.toFixed(2)}/hr (sum)</span></p>
    </ReportCard>
  )
}

function RecruiterPerformanceReport({ candidates, submissions, placements, users }: { candidates: any[]; submissions: any[]; placements: any[]; users: any[] }) {
  const rows = users.map((u) => ({
    recruiter: u.full_name || u.email,
    candidates_owned: candidates.filter((c) => c.recruiter_owner_id === u.id).length,
    submissions_made: submissions.filter((s) => s.submitted_by === u.id).length,
    placements_closed: placements.filter((p) => p.recruiter_id === u.id).length,
  })).filter((r) => r.candidates_owned + r.submissions_made + r.placements_closed > 0)

  return (
    <ReportCard title="Recruiter Performance" onExport={() => exportToCsv('recruiter-performance.csv', rows)}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No recruiter activity recorded yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr><th className="py-2">Recruiter</th><th className="py-2">Candidates</th><th className="py-2">Submissions</th><th className="py-2">Placements</th></tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {rows.map((r) => (
              <tr key={r.recruiter}>
                <td className="py-2 text-gray-800">{r.recruiter}</td>
                <td className="py-2 text-gray-700">{r.candidates_owned}</td>
                <td className="py-2 text-gray-700">{r.submissions_made}</td>
                <td className="py-2 text-gray-700">{r.placements_closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportCard>
  )
}
