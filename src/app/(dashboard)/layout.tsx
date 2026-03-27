import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { DashboardShell } from './DashboardShell'
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

// ─── DashboardLayout ──────────────────────────────────────────────────────────
// ⚡ PERFORMANCE CRITICAL: layout runs on every soft navigation.
// Rule: ZERO sequential DB roundtrips here.
// Auth = JWT only (getUser reads cookie, no network).
// All per-page data fetched client-side via React Query.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fast-path: all metadata from JWT app_metadata (no DB) ──────────────
  const isAdmin      = user.app_metadata?.is_admin       === true
  const isSalesAgent = user.app_metadata?.is_sales_agent === true
  const orgIdFromJWT = user.app_metadata?.org_id as string | undefined
  const roleFromJWT  = user.app_metadata?.org_role as string | undefined

  // Sales agent — worker shell (JWT tells us, no DB needed)
  if (isSalesAgent) {
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>{children}</DashboardShell>
      </HydrationBoundary>
    )
  }

  // Manager — worker shell (JWT fast-path when available, 1 DB call as fallback)
  if (roleFromJWT === 'manager') {
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>{children}</DashboardShell>
      </HydrationBoundary>
    )
  }

  // Need org_id for owner shell — JWT first, single DB fallback
  let orgId = orgIdFromJWT
  if (!orgId) {
    const supaService = createSupabaseServiceClient()
    const { data: orgUser } = await supaService
      .from('org_users').select('org_id, role').eq('user_id', user.id).single()
    if (!orgUser?.org_id) redirect('/unauthorized')
    orgId = orgUser.org_id
    // Manager without JWT org_role
    if (orgUser.role === 'manager') {
      return (
        <HydrationBoundary state={dehydrate(new QueryClient())}>
          <DashboardShell workerMode>{children}</DashboardShell>
        </HydrationBoundary>
      )
    }
  }

  if (!orgId) redirect('/unauthorized')

  // ── Seed React Query cache with data we already have from JWT ─────────────
  // useIsAdmin() and useOrganization() will find this instantly.
  // Organization full data will be fetched client-side by useOrganization().
  const queryClient = new QueryClient()
  queryClient.setQueryData(['is-admin'], isAdmin)
  // Seed orgId so client hooks know it immediately
  queryClient.setQueryData(['active-org-id'], orgId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>{children}</DashboardShell>
    </HydrationBoundary>
  )
}
