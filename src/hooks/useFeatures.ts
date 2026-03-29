'use client'

import { useOrganization } from './useOrganization'
import { useIsAdmin } from './useIsAdmin'

export interface Features {
  hasClients: boolean
  hasVisits: boolean
  hasSales: boolean
  hasPayments: boolean
  hasInventory: boolean
  hasDiary: boolean
  hasAnalytics: boolean
  hasBranches: boolean
  hasSubscriptions: boolean
  hasBooking: boolean
  hasWhatsapp: boolean
  // Legacy aliases (для совместимости со старым кодом)
  hasSms: boolean
  hasStatistics: boolean
  hasReports: boolean
  hasLoyalty: boolean
  // Payment flags
  paymentsEnabled: boolean
  recurringEnabled: boolean
  // Status
  isActive: boolean
  category: string
  isLoading: boolean
}

export function useFeatures(): Features {
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const { data: isAdmin } = useIsAdmin()

  const emptyFeatures: Features = {
    hasClients: false,
    hasVisits: false,
    hasSales: false,
    hasPayments: false,
    hasInventory: false,
    hasDiary: false,
    hasAnalytics: false,
    hasBranches: false,
    hasSubscriptions: false,
    hasBooking: false,
    hasWhatsapp: false,
    hasSms: false,
    hasStatistics: false,
    hasReports: false,
    hasLoyalty: false,
    paymentsEnabled: false,
    recurringEnabled: false,
    isActive: true,
    category: 'other',
    isLoading: true,
  }

  if (orgLoading) return emptyFeatures

  // Админ видит всё
  if (isAdmin) {
    return {
      hasClients: true,
      hasVisits: true,
      hasSales: true,
      hasPayments: true,
      hasInventory: true,
      hasDiary: true,
      hasAnalytics: true,
      hasBranches: true,
      hasSubscriptions: true,
      hasBooking: true,
      hasWhatsapp: true,
      hasSms: true,
      hasStatistics: true,
      hasReports: true,
      hasLoyalty: true,
      paymentsEnabled: true,
      recurringEnabled: true,
      isActive: true,
      category: organization?.category ?? 'other',
      isLoading: false,
    }
  }

  if (!organization) {
    return { ...emptyFeatures, paymentsEnabled: true, isActive: false, isLoading: false }
  }

  const modules = (organization.features as any)?.modules
  const status = organization.subscription_status
  const isDemo = (organization.features as any)?.is_demo === true || (organization.features as any)?.is_trial === true
  const isActive = status === 'active' || status === 'manual' || status === 'demo' || status === 'trial'

  if (modules) {
    return {
      hasClients:       modules.clients       ?? true,
      hasVisits:        modules.visits        ?? true,
      hasSales:         modules.sales         ?? false,
      hasPayments:      modules.payments      ?? false,
      hasInventory:     modules.inventory     ?? false,
      hasDiary:         modules.diary         ?? true,
      hasAnalytics:     modules.analytics     ?? false,
      hasBranches:      modules.branches      ?? organization.branches_enabled ?? false,
      hasSubscriptions: modules.subscriptions ?? false,
      hasBooking:       modules.booking       ?? false,
      hasWhatsapp:      modules.whatsapp      ?? false,
      // Legacy aliases
      hasSms:        false,
      hasStatistics: modules.analytics ?? false,
      hasReports:    modules.analytics ?? false,
      hasLoyalty:    false,
      paymentsEnabled:  modules.payments ?? organization.payments_enabled ?? true,
      recurringEnabled: organization.recurring_enabled === true,
      isActive,
      category: organization.category ?? 'other',
      isLoading: false,
    }
  }

  // Fallback для org без modules — для demo/trial показываем всё
  return {
    hasClients:       true,
    hasVisits:        true,
    hasSales:         isDemo,
    hasPayments:      isDemo,
    hasInventory:     isDemo,
    hasDiary:         true,
    hasAnalytics:     isDemo,
    hasBranches:      organization.branches_enabled ?? false,
    hasSubscriptions: false,
    hasBooking:       false,
    hasWhatsapp:      isDemo,
    hasSms:           false,
    hasStatistics:    isDemo,
    hasReports:       isDemo,
    hasLoyalty:       false,
    paymentsEnabled:  organization.payments_enabled ?? true,
    recurringEnabled: organization.recurring_enabled === true,
    isActive,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}
