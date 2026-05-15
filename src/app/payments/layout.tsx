import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { PaymentsSidebar } from '@/components/payments/PaymentsSidebar'
import { PaymentsHeader } from '@/components/payments/PaymentsHeader'

// ─── PaymentsLayout ───────────────────────────────────────────────────────────
// Изолированный Layout для payments_only пользователей.
// Не импортирует ни одной зависимости Trinity CRM.
// Роутинг в middleware: payments_only → /payments/*, все остальные → /dashboard
export default async function PaymentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // org_type из JWT — без запроса к БД (Edge-safe)
  const orgType = user.app_metadata?.org_type as string | undefined
  const isAdmin = user.app_metadata?.is_admin === true

  if (orgType !== 'payments_only' && !isAdmin) redirect('/dashboard')

  const orgIdFromJWT = user.app_metadata?.org_id as string | undefined
  let orgId = orgIdFromJWT
  if (!orgId) {
    const service = createSupabaseServiceClient()
    const { data: orgUser } = await service
      .from('org_users').select('org_id').eq('user_id', user.id).single()
    if (!orgUser?.org_id) redirect('/unauthorized')
    orgId = orgUser.org_id
  }

  const service = createSupabaseServiceClient()
  const { data: org } = await service
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  return (
    <div className="min-h-screen bg-zinc-950 flex" dir="ltr">
      <PaymentsSidebar orgName={org?.name ?? ''} />
      <div className="flex-1 flex flex-col min-w-0">
        <PaymentsHeader orgName={org?.name ?? ''} userId={user.id} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
