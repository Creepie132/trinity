import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { DashboardStats } from '@/components/payments/DashboardStats'
import { RecentTransactions } from '@/components/payments/RecentTransactions'

// Dashboard — Server Component
// Показывает: сумма за сегодня, за месяц, кол-во транзакций, последние 10 платежей
export default async function PaymentsDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) redirect('/unauthorized')

  const service = createSupabaseServiceClient()

  // Параллельный запрос: статистика + последние транзакции
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [{ data: todayLinks }, { data: monthLinks }, { data: recentLinks }] = await Promise.all([
    service
      .from('payment_links')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'paid')
      .gte('paid_at', startOfDay),
    service
      .from('payment_links')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth),
    service
      .from('payment_links')
      .select('id, amount, currency, status, client_name, client_phone, created_at, paid_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const todayTotal = (todayLinks ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const monthTotal = (monthLinks ?? []).reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Overview of your payment activity</p>
      </div>

      <DashboardStats
        todayTotal={todayTotal}
        monthTotal={monthTotal}
        todayCount={todayLinks?.length ?? 0}
        monthCount={monthLinks?.length ?? 0}
      />

      <RecentTransactions transactions={recentLinks ?? []} />
    </div>
  )
}
