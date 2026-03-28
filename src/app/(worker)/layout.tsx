import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { WorkerShellWrapper } from '@/components/worker/WorkerShellWrapper'

/**
 * WorkerLayout — изолирован от (dashboard)/layout.tsx
 *
 * Порядок проверки доступа (от быстрого к медленному):
 *   1. JWT app_metadata.is_sales_agent     → мгновенно, без DB
 *   2. JWT app_metadata.org_role           → мгновенно, без DB
 *   3. DB: admin_users.is_sales_agent      → один запрос (новые пользователи у которых JWT ещё не обновился)
 *   4. DB: org_users.role                  → один запрос (manager/owner через org)
 *
 * Почему нужен DB fallback:
 *   Supabase выдаёт JWT при invite до updateUserById() — поле is_sales_agent
 *   в app_metadata может отсутствовать при первом входе по инвайт-ссылке.
 */
export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Шаг 1: JWT fast-path (нет DB) ────────────────────────────────────────
  const jwtIsSalesAgent = user.app_metadata?.is_sales_agent === true
  const jwtIsAdmin      = user.app_metadata?.is_admin       === true
  const orgRole         = user.app_metadata?.org_role as string | undefined

  const jwtAllowed =
    jwtIsSalesAgent || jwtIsAdmin ||
    orgRole === 'owner' || orgRole === 'manager' || orgRole === 'sales_agent'

  let isAdmin = jwtIsAdmin

  if (jwtAllowed) {
    // Быстрый путь — JWT достаточно
    const queryClient = new QueryClient()
    queryClient.setQueryData(['is-admin'],     isAdmin)
    queryClient.setQueryData(['is-admin-jwt'], isAdmin)
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WorkerShellWrapper>{children}</WorkerShellWrapper>
      </HydrationBoundary>
    )
  }

  // ── Шаг 2: DB fallback — JWT не обновился (первый вход по invite) ─────────
  // Один запрос к admin_users (продажники Trinity)
  const supaService = createSupabaseServiceClient()

  const { data: adminRow } = await supaService
    .from('admin_users')
    .select('is_sales_agent, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminRow?.is_sales_agent === true) {
    // Продажник найден в DB — обновляем JWT чтобы следующий вход был быстрее
    // (fire-and-forget, не блокируем рендер)
    supaService.auth.admin.updateUserById(user.id, {
      app_metadata: { is_sales_agent: true },
    }).catch(() => {})

    const queryClient = new QueryClient()
    queryClient.setQueryData(['is-admin'],     false)
    queryClient.setQueryData(['is-admin-jwt'], false)
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WorkerShellWrapper>{children}</WorkerShellWrapper>
      </HydrationBoundary>
    )
  }

  // ── Шаг 3: DB fallback — org_users (manager/owner через орг) ─────────────
  const { data: orgRow } = await supaService
    .from('org_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const orgAllowed =
    orgRow?.role === 'manager' ||
    orgRow?.role === 'owner' ||
    orgRow?.role === 'sales_agent'

  if (orgAllowed) {
    isAdmin = orgRow?.role === 'owner'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['is-admin'],     isAdmin)
    queryClient.setQueryData(['is-admin-jwt'], isAdmin)
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WorkerShellWrapper>{children}</WorkerShellWrapper>
      </HydrationBoundary>
    )
  }

  // ── Нет доступа ───────────────────────────────────────────────────────────
  redirect('/unauthorized')
}
