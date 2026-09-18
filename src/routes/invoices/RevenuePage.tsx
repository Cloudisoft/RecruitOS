import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCcw } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import toast from 'react-hot-toast'

const STANDARD_MONTHLY_HOURS = 160

export function RevenuePage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'global_admin'

  const revenueQ = useQuery({
    queryKey: ['revenue-records'],
    queryFn: async () => {
      const { data, error } = await supabase.from('revenue_records').select('*').order('period_month', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  const placementsQ = useQuery({
    queryKey: ['active-placements-for-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase.from('placements').select('*').eq('status', 'active')
      if (error) throw error
      return data ?? []
    },
  })

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { name: string; bill: number; pay: number; margin: number }>()
    for (const r of revenueQ.data ?? []) {
      const key = format(new Date(r.period_month), 'MMM yyyy')
      if (!byMonth.has(key)) byMonth.set(key, { name: key, bill: 0, pay: 0, margin: 0 })
      const row = byMonth.get(key)!
      row.bill += Number(r.bill_amount)
      row.pay += Number(r.pay_amount)
      row.margin += Number(r.margin_amount)
    }
    return Array.from(byMonth.values())
  }, [revenueQ.data])

  async function generateThisMonth() {
    if (!profile) return
    setGenerating(true)
    const periodMonth = startOfMonth(new Date()).toISOString().slice(0, 10)
    try {
      let created = 0
      for (const p of placementsQ.data ?? []) {
        const { data: existing } = await supabase
          .from('revenue_records')
          .select('id')
          .eq('placement_id', p.id)
          .eq('period_month', periodMonth)
          .maybeSingle()
        if (existing) continue
        const { error } = await supabase.from('revenue_records').insert({
          org_id: profile.org_id,
          placement_id: p.id,
          company_id: p.company_id,
          candidate_id: p.candidate_id,
          recruiter_id: p.recruiter_id,
          sales_owner_id: p.sales_owner_id,
          period_month: periodMonth,
          bill_amount: Number(p.bill_rate) * STANDARD_MONTHLY_HOURS,
          pay_amount: Number(p.pay_rate) * STANDARD_MONTHLY_HOURS,
        })
        if (error) throw error
        created++
      }
      toast.success(created > 0 ? `Generated ${created} revenue record(s) for ${format(new Date(), 'MMMM yyyy')}` : 'All active placements already have a revenue record for this month')
      qc.invalidateQueries({ queryKey: ['revenue-records'] })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to generate revenue records')
    } finally {
      setGenerating(false)
    }
  }

  if (revenueQ.isLoading || placementsQ.isLoading) return <LoadingState />

  const totalBill = (revenueQ.data ?? []).reduce((s, r) => s + Number(r.bill_amount), 0)
  const totalMargin = (revenueQ.data ?? []).reduce((s, r) => s + Number(r.margin_amount), 0)

  return (
    <div>
      <PageHeader
        title="Sales / Revenue"
        description={`Revenue is calculated as bill rate × ${STANDARD_MONTHLY_HOURS} standard monthly hours per active placement`}
        actions={isAdmin && (
          <Button onClick={generateThisMonth} loading={generating}>
            <RefreshCcw className="h-4 w-4" /> Generate this month's revenue
          </Button>
        )}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardBody><p className="text-xs text-gray-500">Total Billed Revenue</p><p className="text-xl font-semibold text-gray-900">${totalBill.toLocaleString()}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-gray-500">Total Margin</p><p className="text-xl font-semibold text-green-600">${totalMargin.toLocaleString()}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-gray-500">Active Placements</p><p className="text-xl font-semibold text-gray-900">{placementsQ.data?.length ?? 0}</p></CardBody></Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Revenue by Month</h3>
          {chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No revenue records yet. {isAdmin && 'Click "Generate this month\'s revenue" to create records from active placements.'}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="bill" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Billed" />
                <Bar dataKey="margin" fill="#22c55e" radius={[4, 4, 0, 0]} name="Margin" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
