import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import TodayBlock from '@/components/dashboard/TodayBlock'
import FABMenu from '@/components/dashboard/FABMenu'
import { StatsCardsSkeleton } from '@/components/dashboard/StatsCardsSkeleton'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'

export default async function DashboardPage() {
  // Get orgId from server session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single()

  const orgId = orgUser?.org_id

  if (!orgId) {
    redirect('/unauthorized')
  }

  // Get user's name for greeting
  const { data: profile } = await supabase
    .from('org_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <DashboardWrapper userName={userName} orgId={orgId}>
      {/* Header with localized greeting inside wrapper */}

      {/* Stats Cards with Suspense */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards orgId={orgId} />
      </Suspense>

      {/* Today Block */}
      <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
        <TodayBlock orgId={orgId} />
      </Suspense>

      {/* Charts and Onboarding - Client Component */}
      <DashboardClient orgId={orgId} />

      {/* Floating Action Button */}
      <FABMenu />
    </DashboardWrapper>
  )
}
