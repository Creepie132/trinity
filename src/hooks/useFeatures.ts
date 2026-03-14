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
  hasLoyalty: boolean
  hasSales: boolean
  hasDiary: boolean
  hasBranches: boolean
  paymentsEnabled: boolean
  recurringEnabled: boolean
  isActive: boolean
  category: string
  isLoading: boolean
}

export function useFeatures(): Features {
  const { data: organization, isLoading: orgLoading } = useOrganization()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  if (orgLoading || adminLoading) {
    // Пока данные грузятся — НЕ показываем ни одного модуля.
    // Sidebar покажет скелетон. Это предотвращает flash когда пункты
    // сначала появляются частично, а потом дополняются.
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
      hasLoyalty: false,
      hasSales: false,
      hasDiary: false,
      hasBranches: false,
      paymentsEnabled: false,
      recurringEnabled: false,
      isActive: true,
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
      hasLoyalty: true,
      hasSales: true,
      hasDiary: true,
      hasBranches: true,
      paymentsEnabled: true,
      recurringEnabled: true,
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
      hasLoyalty: false,
      hasSales: false,
      hasDiary: false,
      hasBranches: false,
      paymentsEnabled: true,
      recurringEnabled: false,
      isActive: false,
      category: 'other',
      isLoading: false,
    }
  }

  // Check if using new modular system
  const modules = (organization.features as any)?.modules

  if (modules) {
    return {
      hasClients: modules.clients ?? true,
      hasVisits: modules.visits ?? true,
      hasDiary: modules.diary ?? true,
      hasSms: modules.sms ?? false,
      hasPayments: modules.payments ?? false,
      // analytics — новый единый модуль; статистика/отчёты — legacy алиасы
      hasAnalytics: modules.analytics ?? (modules.statistics || modules.reports) ?? false,
      hasStatistics: modules.analytics ?? modules.statistics ?? false,
      hasReports: modules.analytics ?? modules.reports ?? false,
      hasSubscriptions: modules.subscriptions ?? false,
      hasInventory: modules.inventory ?? false,
      hasBooking: modules.booking ?? false,
      hasLoyalty: modules.loyalty ?? false,
      hasSales: modules.sales ?? false,
      // branches: модуль ИЛИ флаг на организации
      hasBranches: modules.branches ?? organization.branches_enabled ?? false,
      paymentsEnabled: organization.payments_enabled ?? true,
      recurringEnabled: organization.recurring_enabled === true,
      isActive: organization.is_active ?? false,
      category: organization.category ?? 'other',
      isLoading: false,
    }
  }

  // Fallback: старая система фич (legacy orgs без modules)
  return {
    hasClients: true,
    hasVisits: (organization.features as any)?.visits ?? true,
    hasDiary: (organization.features as any)?.diary ?? true,
    hasSms: organization.features?.sms ?? false,
    hasPayments: organization.features?.payments ?? false,
    hasAnalytics: organization.features?.analytics ?? false,
    hasStatistics: organization.features?.analytics ?? false,
    hasReports: organization.features?.analytics ?? false,
    hasSubscriptions: organization.features?.subscriptions ?? false,
    hasInventory: organization.features?.inventory ?? false,
    hasBooking: (organization.features as any)?.booking ?? false,
    hasLoyalty: false,
    hasSales: false,
    hasBranches: organization.branches_enabled ?? false,
    paymentsEnabled: organization.payments_enabled ?? true,
    recurringEnabled: organization.recurring_enabled === true,
    isActive: organization.is_active ?? false,
    category: organization.category ?? 'other',
    isLoading: false,
  }
}