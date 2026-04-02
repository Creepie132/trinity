// ─── Trinity Notification System — Public API ─────────────────────────────────
// Import from here, not from sub-files directly.
//
// Usage:
//   import { ToastStack } from '@/components/notifications'
//   import { useNotification } from '@/hooks/useNotification'

export { ToastStack }               from './ToastStack'
export { requestBrowserPermission, getBrowserPermission } from './BrowserNotificationManager'
export type { ToastOptions, ToastItem, ToastVariant, ToastPriority, ToastAction } from './types'
