import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const start = `${month}-01`
  const end = new Date(
    new Date(start).getFullYear(),
    new Date(start).getMonth() + 1,
    0
  ).toISOString().split('T')[0]

  const service = createSupabaseServiceClient()

  // Доходы: payments completed за месяц
  const { data: payments } = await service
    .from('payments')
    .select('amount, created_at')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .gte('created_at', `${start}T00:00:00`)
    .lte('created_at', `${end}T23:59:59`)

  // Расходы за месяц
  const { data: expenses } = await service
    .from('expenses')
    .select('amount, expense_date')
    .eq('org_id', orgId)
    .gte('expense_date', start)
    .lte('expense_date', end)

  // Строим map день → сумма
  const incomeByDay: Record<string, number> = {}
  const expenseByDay: Record<string, number> = {}

  for (const p of payments ?? []) {
    const day = p.created_at.split('T')[0]
    incomeByDay[day] = (incomeByDay[day] ?? 0) + Number(p.amount)
  }

  for (const e of expenses ?? []) {
    const day = e.expense_date
    if (!day) continue
    expenseByDay[day] = (expenseByDay[day] ?? 0) + Number(e.amount ?? 0)
  }

  // Генерируем все дни месяца
  const days: { date: string; income: number; expense: number }[] = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    const key = cur.toISOString().split('T')[0]
    days.push({
      date: key,
      income: incomeByDay[key] ?? 0,
      expense: expenseByDay[key] ?? 0,
    })
    cur.setDate(cur.getDate() + 1)
  }

  return NextResponse.json({ days })
}
