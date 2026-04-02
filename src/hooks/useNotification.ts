// ─── useNotification — public hook ───────────────────────────────────────────
// The single entry point for showing toasts from anywhere in Trinity.
//
// Usage:
//   const { show, success, payment, critical } = useNotification()
//   show({ title: 'Платёж принят', variant: 'payment', priority: 'high' })

'use client'

import { useCallback } from 'react'
import { useNotificationStore } from '@/components/notifications/NotificationStore'
import { playNotificationSound } from '@/components/notifications/SoundManager'
import { showBrowserNotification } from '@/components/notifications/BrowserNotificationManager'
import type { ToastOptions, ToastVariant, ToastPriority } from '@/components/notifications/types'

export function useNotification() {
  const store = useNotificationStore()

  const show = useCallback((options: ToastOptions): string => {
    const id = store.show(options)

    const variant: ToastVariant   = options.variant  ?? 'info'
    const priority: ToastPriority = options.priority ?? 'normal'

    if (options.sound !== false) {
      playNotificationSound(variant, priority)
    }

    // Browser notification only when tab is hidden
    if (options.browserNotification !== false && typeof document !== 'undefined' && document.hidden) {
      showBrowserNotification(options.title, options.description, variant, options.action?.onClick)
    }

    return id
  }, [store])

  const success = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'success', ...extra }), [show])

  const error = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'error', priority: 'high', ...extra }), [show])

  const warning = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'warning', priority: 'high', ...extra }), [show])

  const info = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'info', ...extra }), [show])

  const payment = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'payment', priority: 'high', ...extra }), [show])

  const client = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'client', ...extra }), [show])

  const visit = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'visit', ...extra }), [show])

  const critical = useCallback((title: string, description?: string, extra?: Partial<ToastOptions>) =>
    show({ title, description, variant: 'critical', priority: 'urgent', duration: 0, ...extra }), [show])

  return {
    show,
    success,
    error,
    warning,
    info,
    payment,
    client,
    visit,
    critical,
    dismiss:    store.dismiss,
    dismissAll: store.dismissAll,
  }
}
