import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { WorkerShellWrapper } from '@/components/worker/WorkerShellWrapper'

/**
 * ⚡ Worker Layout — полностью изолирован от (dashboard)/layout.tsx
 *
 * Единственная серверная задача: проверить сессию через JWT (нет DB-запросов).
 * WorkerShell (сайдбар, навигация, хартбит) рендерится на клиенте.
 * Все данные — через React Query хуки внутри страниц.
 */
export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Быстрая проверка роли из JWT app_metadata — нет DB-запросов
  const isAdmin      = user.app_metadata?.is_admin       === true
  const isSalesAgent = user.app_metadata?.is_sales_agent === true
  const orgRole      = user.app_metadata?.org_role as string | undefined

  // Только owner/admin/manager/sales_agent имеют доступ к /worker
  const allowed =
    isAdmin || isSalesAgent ||
    orgRole === 'owner' || orgRole === 'manager' || orgRole === 'sales_agent'

  if (!allowed) redirect('/unauthorized')

  const queryClient = new QueryClient()
  queryClient.setQueryData(['is-admin'],     isAdmin)
  queryClient.setQueryData(['is-admin-jwt'], isAdmin)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkerShellWrapper>{children}</WorkerShellWrapper>
    </HydrationBoundary>
  )
}
