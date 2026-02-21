import { Suspense } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { VisitsChart } from '@/components/dashboard/VisitsChart'
import { TopServicesChart } from '@/components/dashboard/TopServicesChart'
import { 
  StatsGridSkeleton, 
  ChartsRowSkeleton, 
  ChartSkeleton 
} from '@/components/dashboard/skeletons'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

async function getOrgId() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  return orgUser?.org_id || null
}

export default async function DashboardPage() {
  const orgId = await getOrgId()

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Организация не найдена</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Client-side logic for features check and onboarding */}
      <DashboardClient orgId={orgId} />

      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Обзор вашего бизнеса
          </p>
        </div>

        {/* Stats Cards with Suspense */}
        <Suspense fallback={<StatsGridSkeleton />}>
          <StatsCards orgId={orgId} />
        </Suspense>

        {/* Charts Row 1 with Suspense */}
        <Suspense fallback={<ChartsRowSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart orgId={orgId} />
            <VisitsChart orgId={orgId} />
          </div>
        </Suspense>

        {/* Top Services Chart with Suspense */}
        <Suspense fallback={<ChartSkeleton />}>
          <TopServicesChart orgId={orgId} />
        </Suspense>
      </div>
    </>
  )
}
