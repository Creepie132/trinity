import { useAuth } from './useAuth'

export interface Permissions {
  // User permissions (available to all roles)
  canManageVisits: boolean // create/start/complete visits
  canManageClients: boolean // create/edit clients
  canAcceptPayments: boolean // accept payments, create payment links
  canSendBirthdayMessage: boolean // send birthday wishes from popup
  canChangeDisplaySettings: boolean // theme, language, layout

  // Moderator+ permissions
  canViewAnalytics: boolean // access analytics page
  canManageInventory: boolean // manage products and stock
  canSendSMS: boolean // send SMS campaigns

  // Owner-only permissions
  canManageServices: boolean // manage services list
  canManageCareInstructions: boolean // manage care instructions
  canManageBookingSettings: boolean // configure online booking
  canManageBirthdayTemplates: boolean // configure birthday message templates
  canManageUsers: boolean // invite/remove/change roles of org users
}

export function usePermissions(): Permissions {
  const { role } = useAuth()

  // Default: no permissions (safety fallback)
  if (!role) {
    return {
      canManageVisits: false,
      canManageClients: false,
      canAcceptPayments: false,
      canSendBirthdayMessage: false,
      canChangeDisplaySettings: false,
      canViewAnalytics: false,
      canManageInventory: false,
      canSendSMS: false,
      canManageServices: false,
      canManageCareInstructions: false,
      canManageBookingSettings: false,
      canManageBirthdayTemplates: false,
      canManageUsers: false,
    }
  }

  // Base permissions for all roles
  const basePermissions = {
    canManageVisits: true,
    canManageClients: true,
    canAcceptPayments: true,
    canSendBirthdayMessage: true,
    canChangeDisplaySettings: true,
  }

  // Moderator+ permissions
  const moderatorPermissions = {
    ...basePermissions,
    canViewAnalytics: role !== 'user',
    canManageInventory: role !== 'user',
    canSendSMS: role !== 'user',
  }

  // Owner-only permissions
  const ownerPermissions = {
    ...moderatorPermissions,
    canManageServices: role === 'owner',
    canManageCareInstructions: role === 'owner',
    canManageBookingSettings: role === 'owner',
    canManageBirthdayTemplates: role === 'owner',
    canManageUsers: role === 'owner',
  }

  return ownerPermissions
}
