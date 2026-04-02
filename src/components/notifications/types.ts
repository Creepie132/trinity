// ─── Trinity Toast Notification System — Types ───────────────────────────────
// Premium notification architecture for Trinity CRM
// Design direction: Linear / Stripe / Notion

export type ToastVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'payment'
  | 'client'
  | 'visit'
  | 'task'
  | 'system'
  | 'critical'

export type ToastPriority = 'normal' | 'high' | 'urgent'

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'ghost'
}

export interface ToastOptions {
  id?: string
  title: string
  description?: string
  variant?: ToastVariant
  priority?: ToastPriority
  duration?: number          // ms, 0 = persistent
  action?: ToastAction
  secondaryAction?: ToastAction
  sound?: boolean            // default true
  browserNotification?: boolean
  icon?: React.ReactNode     // override default icon
}

export interface ToastItem extends ToastOptions {
  id: string
  createdAt: number
  isPaused: boolean
  isExiting: boolean
  variant: ToastVariant
  priority: ToastPriority
  duration: number
  sound: boolean
}
