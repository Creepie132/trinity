'use client'

import { useOrganization } from './useOrganization'
import { useIsAdmin } from './useIsAdmin'

export interface Features {
  hasSms: boolean
  hasPayments: boolean
  hasAnalytics: boolean
  isActive: boolean
  category: string
  isLoading: boolean
}

export function useFeatures(): Features {
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  if (orgLoading || adminLoading) {
    return {
      hasSms: false,
      hasPayments: false,
      hasAnalytics: false,
      isActive: false,
      category: 'other',
      isLoading: true,
    }
  }

  // Админ видит всё
  if (isAdmin) {
    return {
      hasSms: true,
      hasPayments: true,
      hasAnalytics: true,
      isActive: true,
      category: organization?.category ?? 'other',
      isLoading: false,
    }
  }

  if (!organization) {
    return {
      hasSms: false,
      hasPayments: false,
      hasAnalytics: false,
      isActive: false,
      category: 'other',
      isLoading: false,
    }
  }

  return {
    hasSms: organization.features?.sms ?? true,
    hasPayments: organization.features?.payments ?? true,
    hasAnalytics: organization.features?.analytics ?? true,
    isActive: organization.is_active ?? false,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}