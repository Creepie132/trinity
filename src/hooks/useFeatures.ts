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
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

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

  if (orgLoading || adminLoading) return emptyFeatures

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

  // Новые 3 статуса: active, inactive, demo
  // Legacy поддержка: manual → active, trial → demo
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

  // Fallback для org без modules
  return {
    hasClients:       true,
    hasVisits:        true,
    hasSales:         false,
    hasPayments:      false,
    hasInventory:     false,
    hasDiary:         true,
    hasAnalytics:     false,
    hasBranches:      organization.branches_enabled ?? false,
    hasSubscriptions: false,
    hasBooking:       false,
    hasSms:           false,
    hasStatistics:    false,
    hasReports:       false,
    hasLoyalty:       false,
    paymentsEnabled:  organization.payments_enabled ?? true,
    recurringEnabled: organization.recurring_enabled === true,
    isActive,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}
