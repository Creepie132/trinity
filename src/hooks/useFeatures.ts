'use client'

import { useOrganization } from './useOrganization'
import { useIsAdmin } from './useIsAdmin'

export interface Features {
  hasClients: boolean
  hasSms: boolean
  hasPayments: boolean
  hasAnalytics: boolean
  hasStatistics: boolean
  hasReports: boolean
  hasSubscriptions: boolean
  hasVisits: boolean
  hasInventory: boolean
  hasBooking: boolean
  hasTelegram: boolean
  hasLoyalty: boolean
  hasBirthday: boolean
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
      hasStatistics: false,
      hasReports: false,
      hasSubscriptions: false,
      hasVisits: false,
      hasInventory: false,
      hasBooking: false,
      hasTelegram: false,
      hasLoyalty: false,
      hasBirthday: false,
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
      hasStatistics: true,
      hasReports: true,
      hasSubscriptions: true,
      hasVisits: true,
      hasInventory: true,
      hasBooking: true,
      hasTelegram: true,
      hasLoyalty: true,
      hasBirthday: true,
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
      hasStatistics: false,
      hasReports: false,
      hasSubscriptions: false,
      hasVisits: false,
      hasInventory: false,
      hasBooking: false,
      hasTelegram: false,
      hasLoyalty: false,
      hasBirthday: false,
      isActive: false,
      category: 'other',
      isLoading: false,
    }
  }

  // Check if using new modular system
  const modules = (organization.features as any)?.modules
  
  if (modules) {
    return {
      // Always visible modules (clients, visits, diary)
      hasClients: modules.clients ?? true,
      hasVisits: modules.visits ?? true,
      // Optional modules (default to false unless explicitly enabled)
      hasSms: modules.sms ?? false,
      hasPayments: modules.payments ?? false,
      hasAnalytics: (modules.statistics || modules.reports) ?? false,
      hasStatistics: modules.statistics ?? false,
      hasReports: modules.reports ?? false,
      hasSubscriptions: modules.subscriptions ?? false,
      hasInventory: modules.inventory ?? false,
      hasBooking: modules.booking ?? false,
      hasTelegram: modules.telegram ?? false,
      hasLoyalty: modules.loyalty ?? false,
      hasBirthday: modules.birthday ?? false,
      isActive: organization.is_active ?? false,
      category: organization.category ?? 'other',
      isLoading: false,
    }
  }

  // Fallback to old feature system
  return {
    hasClients: (organization.features as any)?.clients ?? true,
    hasSms: organization.features?.sms ?? true,
    hasPayments: organization.features?.payments ?? true,
    hasAnalytics: organization.features?.analytics ?? true,
    hasStatistics: organization.features?.analytics ?? true,
    hasReports: organization.features?.analytics ?? true,
    hasSubscriptions: organization.features?.subscriptions ?? false,
    hasVisits: organization.features?.visits ?? true,
    hasInventory: organization.features?.inventory ?? false,
    hasBooking: (organization.features as any)?.booking ?? false,
    hasTelegram: false,
    hasLoyalty: false,
    hasBirthday: false,
    isActive: organization.is_active ?? false,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}