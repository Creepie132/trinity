import { NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/commission
// Returns monthly + all-time commission summary

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const prevStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const prevEnd    = monthStart

    const [currRes, prevRes, totalRes] = await Promise.all([
      supabase
        .from('revenue_logs')
        .select('setup_fee, commission_amount')
        .eq('worker_id', user.id)
        .gte('entered_at', monthStart)
        .lt('entered_at', monthEnd),

      supabase
        .from('revenue_logs')
        .select('commission_amount')
        .eq('worker_id', user.id)
        .gte('entered_at', prevStart)
        .lt('entered_at', prevEnd),

      supabase
        .from('revenue_logs')
        .select('setup_fee, commission_amount')
        .eq('worker_id', user.id),
    ])

    const curr  = currRes.data  ?? []
    const prev  = prevRes.data  ?? []
    const total = totalRes.data ?? []

    const monthFee        = curr.reduce((s, r) => s + Number(r.setup_fee ?? 0), 0)
    const monthCommission = curr.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)
    const prevCommission  = prev.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)
    const totalFee        = total.reduce((s, r) => s + Number(r.setup_fee ?? 0), 0)
    const totalCommission = total.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)

    const percentChange = prevCommission > 0
      ? Math.round(((monthCommission - prevCommission) / prevCommission) * 100)
      : null

    return NextResponse.json({
      month_total_fee:      Math.round(monthFee * 100) / 100,
      month_commission:     Math.round(monthCommission * 100) / 100,
      count:                curr.length,
      prev_month_commission: Math.round(prevCommission * 100) / 100,
      percent_change:       percentChange,
      total_fee:            Math.round(totalFee * 100) / 100,
      total_commission:     Math.round(totalCommission * 100) / 100,
      total_count:          total.length,
      period:               { year: now.getFullYear(), month: now.getMonth() + 1 },
    })
  } catch (err) {
    console.error('[GET /api/worker/commission]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
