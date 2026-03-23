import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getActiveOrgId } from '@/lib/get-active-org'
import { DashboardShell } from './DashboardShell'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Продажники Trinity не привязаны к org — проверяем отдельно
  const service = createSupabaseServiceClient()
  const { data: adminRow } = await service
    .from('admin_users')
    .select('is_sales_agent')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminRow?.is_sales_agent) {
    // Продажник Trinity (admin_users) — без sidebar
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>
          {children}
        </DashboardShell>
      </HydrationBoundary>
    )
  }

  // Проверяем роль manager в org_users — тоже без основного sidebar
  const { data: orgUserRow } = await service
    .from('org_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (orgUserRow?.role === 'manager') {
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>
          {children}
        </DashboardShell>
      </HydrationBoundary>
    )
  }

  // org_id из JWT, fallback на таблицу
  let orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) {
    const { data: orgUser } = await supabase
      .from('org_users').select('org_id').eq('user_id', user.id).single()
    orgId = orgUser?.org_id
  }
  if (!orgId) redirect('/unauthorized')

  // Активный филиал из БД
  const activeOrgId = await getActiveOrgId(user.id, orgId)

  // Prefetch организации + первая страница клиентов — всё параллельно
  const [{ data: organization }] = await Promise.all([
    service.from('organizations').select('*').eq('id', activeOrgId).single(),
  ])

  // isAdmin из JWT — без DB roundtrip
  const isAdmin = user.app_metadata?.is_admin === true

  // Кладём в React Query cache — useOrganization() и useIsAdmin() найдут данные сразу
  const queryClient = new QueryClient()
  if (organization) queryClient.setQueryData(['organization', activeOrgId], organization)
  queryClient.setQueryData(['is-admin'], isAdmin)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </HydrationBoundary>
  )
}
