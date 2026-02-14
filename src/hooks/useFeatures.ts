'use client'

import { useOrganization } from './useOrganization'
import { useIsAdmin } from './useIsAdmin'

export interface Features {
  hasClients: boolean
  hasSms: boolean
  hasPayments: boolean
  hasAnalytics: boolean
  hasSubscriptions: boolean
  hasVisits: boolean
  hasInventory: boolean
  isActive: boolean
  category: string
  isLoading: boolean
}

export function useFeatures(): Features {
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  if (orgLoading || adminLoading) {
    return {
      hasClients: false,
      hasSms: false,
      hasPayments: false,
      hasAnalytics: false,
      hasSubscriptions: false,
      hasVisits: false,
      hasInventory: false,
      isActive: false,
      category: 'other',
      isLoading: true,
    }
  }

  // Админ видит всё
  if (isAdmin) {
    return {
      hasClients: true,
      hasSms: true,
      hasPayments: true,
      hasAnalytics: true,
      hasSubscriptions: true,
      hasVisits: true,
      hasInventory: true,
      isActive: true,
      category: organization?.category ?? 'other',
      isLoading: false,
    }
  }

  if (!organization) {
    return {
      hasClients: false,
      hasSms: false,
      hasPayments: false,
      hasAnalytics: false,
      hasSubscriptions: false,
      hasVisits: false,
      hasInventory: false,
      isActive: false,
      category: 'other',
      isLoading: false,
    }
  }

  return {
    hasClients: (organization.features as any)?.clients ?? true,
    hasSms: organization.features?.sms ?? true,
    hasPayments: organization.features?.payments ?? true,
    hasAnalytics: organization.features?.analytics ?? true,
    hasSubscriptions: organization.features?.subscriptions ?? false,
    hasVisits: organization.features?.visits ?? true,
    hasInventory: organization.features?.inventory ?? false,
    isActive: organization.is_active ?? false,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}