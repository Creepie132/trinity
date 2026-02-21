import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import { StatsCardsSkeleton } from '@/components/dashboard/StatsCardsSkeleton'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  // Get orgId from server session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  const orgId = orgUser?.org_id

  if (!orgId) {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header - ALWAYS RENDERS IMMEDIATELY */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Обзор вашего бизнеса
        </p>
      </div>

      {/* Stats Cards with Suspense */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards orgId={orgId} />
      </Suspense>

      {/* Charts and Onboarding - Client Component */}
      <DashboardClient orgId={orgId} />
    </div>
  )
}
