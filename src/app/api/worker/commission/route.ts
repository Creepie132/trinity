import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/commission
// Returns monthly commission summary for the current worker
// Response: { month_total_fee, month_commission, count, prev_month_commission, percent_change }

export async function GET(request: NextRequest) {
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

    const [currRes, prevRes] = await Promise.all([
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
    ])

    const curr = currRes.data ?? []
    const prev = prevRes.data ?? []

    const monthFee        = curr.reduce((s, r) => s + Number(r.setup_fee ?? 0), 0)
    const monthCommission = curr.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)
    const prevCommission  = prev.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)

    const percentChange = prevCommission > 0
      ? Math.round(((monthCommission - prevCommission) / prevCommission) * 100)
      : null

    return NextResponse.json({
      month_total_fee:      Math.round(monthFee * 100) / 100,
      month_commission:     Math.round(monthCommission * 100) / 100,
      count:                curr.length,
      prev_month_commission: Math.round(prevCommission * 100) / 100,
      percent_change:       percentChange,
      period: { year: now.getFullYear(), month: now.getMonth() + 1 },
    })
  } catch (err) {
    console.error('[GET /api/worker/commission]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
