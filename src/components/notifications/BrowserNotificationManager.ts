// ─── BrowserNotificationManager ─────────────────────────────────────────────
// Handles browser Push Notifications with permission flow.
// Graceful degradation — works without permission.

import type { ToastVariant } from './types'

const VARIANT_ICON: Record<ToastVariant, string> = {
  info:     '/icons/icon-192x192.png',
  success:  '/icons/icon-192x192.png',
  warning:  '/icons/icon-192x192.png',
  error:    '/icons/icon-192x192.png',
  payment:  '/icons/icon-192x192.png',
  client:   '/icons/icon-192x192.png',
  visit:    '/icons/icon-192x192.png',
  task:     '/icons/icon-192x192.png',
  system:   '/icons/icon-192x192.png',
  critical: '/icons/icon-192x192.png',
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function showBrowserNotification(
  title: string,
  body: string | undefined,
  variant: ToastVariant,
  onClick?: () => void,
): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const n = new Notification(title, {
      body,
      icon: VARIANT_ICON[variant],
      badge: '/icons/icon-192x192.png',
      tag: `trinity-${variant}-${Date.now()}`,
      silent: true, // We handle sound ourselves
    })
    if (onClick) n.onclick = () => { window.focus(); onClick() }
    // Auto-close after 6s
    setTimeout(() => n.close(), 6000)
  } catch {
    // Fail silently — browser may block in certain contexts
  }
}
