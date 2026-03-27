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
// Only ONE DB query: organizations (needed by useOrganization/useDemoMode).
// All other data fetched client-side via React Query hooks.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fast-path: all roles/flags from JWT app_metadata (no DB) ───────────
  const isAdmin      = user.app_metadata?.is_admin       === true
  const isSalesAgent = user.app_metadata?.is_sales_agent === true
  const orgIdFromJWT = user.app_metadata?.org_id as string | undefined
  const roleFromJWT  = user.app_metadata?.org_role as string | undefined

  // Sales agent → worker shell (JWT, no DB)
  if (isSalesAgent) {
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>{children}</DashboardShell>
      </HydrationBoundary>
    )
  }

  // Manager fast-path (JWT)
  if (roleFromJWT === 'manager') {
    return (
      <HydrationBoundary state={dehydrate(new QueryClient())}>
        <DashboardShell workerMode>{children}</DashboardShell>
      </HydrationBoundary>
    )
  }

  // Need org_id — JWT first, single DB fallback
  let orgId = orgIdFromJWT
  if (!orgId) {
    const supaService = createSupabaseServiceClient()
    const { data: orgUser } = await supaService
      .from('org_users').select('org_id, role').eq('user_id', user.id).single()
    if (!orgUser?.org_id) redirect('/unauthorized')
    orgId = orgUser.org_id
    if (orgUser.role === 'manager') {
      return (
        <HydrationBoundary state={dehydrate(new QueryClient())}>
          <DashboardShell workerMode>{children}</DashboardShell>
        </HydrationBoundary>
      )
    }
  }

  if (!orgId) redirect('/unauthorized')

  // ── ONE DB query: organization data — seeds useOrganization + useDemoMode ─
  // This eliminates the 2-roundtrip client-side fetch that was causing
  // 400-700ms delay on Sales and Analytics pages.
  const supaService = createSupabaseServiceClient()
  const { data: organization } = await supaService
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  // Seed React Query cache — all client hooks find data instantly on mount
  const queryClient = new QueryClient()
  queryClient.setQueryData(['is-admin'], isAdmin)
  queryClient.setQueryData(['active-org-id'], orgId)
  // Key matches useOrganization queryKey: ['organization', cookieOrgId ?? activeOrgId]
  // We seed both possible key variants to guarantee a cache hit
  if (organization) {
    queryClient.setQueryData(['organization', orgId], organization)
    queryClient.setQueryData(['organization', null], organization)
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>{children}</DashboardShell>
    </HydrationBoundary>
  )
}
