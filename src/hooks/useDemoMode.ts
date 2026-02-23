'use client'

import { useOrganization } from '@/hooks/useOrganization'

export function useDemoMode() {
  const { data: organization } = useOrganization()

  // Get plan from organization
  const plan = (organization as any)?.plan || 'demo'

  // Check if organization is in trial mode (DEMO)
  const isDemo = plan === 'demo' || (organization as any)?.subscription_status === 'trial'

  // Get client limit from features or default based on plan
  const featuresClientLimit = (organization as any)?.features?.client_limit
  const clientLimit = featuresClientLimit !== undefined && featuresClientLimit !== null
    ? featuresClientLimit
    : (isDemo ? 10 : null)

  // Calculate days left in trial
  const daysLeft = isDemo && (organization as any)?.subscription_expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date((organization as any).subscription_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null

  return {
    isDemo,
    plan,
    clientLimit,
    daysLeft,
  }
}
