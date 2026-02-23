'use client'

import { useOrganization } from '@/hooks/useOrganization'

export function useDemoMode() {
  const { data: organization } = useOrganization()

  // Check if organization is in trial mode (DEMO)
  const isDemo = (organization as any)?.subscription_status === 'trial'

  // Client limit for demo users (10 clients max)
  const clientLimit = isDemo ? 10 : Infinity

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
    clientLimit,
    daysLeft,
  }
}
