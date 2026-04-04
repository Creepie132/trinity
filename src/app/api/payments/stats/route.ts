import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/payments/stats
 * Статистика платежей за месяц для мобильного приложения.
 * Query: ?month=YYYY-MM
 *
 * Возвращает: { totalAmount, count, avgAmount }
 * Bearer auth поддерживается (getAuthContext(request)).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM

  const service = createSupabaseServiceClient()

  let query = service
    .from('payments')
    .select('amount')
    .eq('org_id', orgId)
    .eq('status', 'completed')

  if (month) {
    const start = `${month}-01`
    const end = new Date(
      new Date(start).getFullYear(),
      new Date(start).getMonth() + 1,
      0
    ).toISOString().split('T')[0]
    query = query
      .gte('paid_at', `${start}T00:00:00.000Z`)
      .lte('paid_at', `${end}T23:59:59.999Z`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const payments = data ?? []
  const totalAmount = payments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const count = payments.length
  const avgAmount = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0

  return NextResponse.json({
    totalAmount: Math.round(totalAmount * 100) / 100,
    count,
    avgAmount,
  })
}
