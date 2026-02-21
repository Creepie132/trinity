'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useQuery } from '@tanstack/react-query'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function DashboardClient({ orgId }: { orgId: string }) {
  const router = useRouter()
  const features = useFeatures()
  const supabase = createSupabaseBrowserClient()

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  // Check if onboarding is needed
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-check', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!orgId) return { showOnboarding: false, organizationName: '' }

      // Parallel queries
      const [orgResult, servicesResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('name, features')
          .eq('id', orgId)
          .single(),
        supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId),
      ])

      const onboardingCompleted = orgResult.data?.features?.onboarding_completed ?? false
      const hasServices = (servicesResult.count || 0) > 0

      return {
        showOnboarding: !onboardingCompleted || !hasServices,
        organizationName: orgResult.data?.name || '',
      }
    },
  })

  return (
    <>
      {/* Onboarding Wizard */}
      {onboardingData?.showOnboarding && (
        <OnboardingWizard
          open={true}
          organizationName={onboardingData.organizationName}
        />
      )}
    </>
  )
}
