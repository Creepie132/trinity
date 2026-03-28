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
// ⚡ PERFORMANCE CRITICAL: layout runs on every soft navigation for /dashboard,
// /clients, /visits, /payments, /diary, /office, etc.
//
// /worker/* routes are FULLY ISOLATED in src/app/(worker)/layout.tsx
// and NEVER reach this layout.
//
// Only ONE DB query here: organizations (seeds useOrganization/useDemoMode).
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
  const orgIdFromJWT = user.app_metadata?.org_id as string | undefined

  // Need org_id — JWT first, single DB fallback
  let orgId = orgIdFromJWT
  if (!orgId) {
    const supaService = createSupabaseServiceClient()
    const { data: orgUser } = await supaService
      .from('org_users').select('org_id').eq('user_id', user.id).single()
    if (!orgUser?.org_id) redirect('/unauthorized')
    orgId = orgUser.org_id
  }

  if (!orgId) redirect('/unauthorized')

  // ── ONE DB query: organization data — seeds useOrganization + useDemoMode ─
  const supaService = createSupabaseServiceClient()
  const { data: organization } = await supaService
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  // Seed React Query cache — all client hooks find data instantly on mount
  const queryClient = new QueryClient()
  queryClient.setQueryData(['is-admin'],     isAdmin)
  queryClient.setQueryData(['is-admin-jwt'], isAdmin)
  queryClient.setQueryData(['active-org-id'], orgId)
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
