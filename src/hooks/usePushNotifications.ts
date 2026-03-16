'use client'

import { useState, useEffect, useCallback } from 'react'

const PUSH_DISMISSED_KEY = 'push_permission_dismissed_at'
const PUSH_SUBSCRIBED_KEY = 'push_subscribed'
const DISMISS_TTL_DAYS = 14

export type PushPermissionState = 'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications() {
  const [permissionState, setPermissionState] = useState<PushPermissionState>('idle')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ── Init: определяем текущее состояние ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Проверка поддержки
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPermissionState('unsupported')
      return
    }

    const current = Notification.permission as NotificationPermission
    if (current === 'granted') {
      setPermissionState('granted')
      setIsSubscribed(localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true')
      return
    }
    if (current === 'denied') {
      setPermissionState('denied')
      return
    }

    // default — можно спросить
    setPermissionState('prompt')

    // Показывать ли наш UI prompt?
    const dismissedAt = localStorage.getItem(PUSH_DISMISSED_KEY)
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < DISMISS_TTL_DAYS) return
      localStorage.removeItem(PUSH_DISMISSED_KEY)
    }

    // Показываем через 3 сек после входа — не сразу
    const timer = setTimeout(() => setShowPrompt(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // ── Регистрируем Service Worker ───────────────────────────────────────────
  const registerSW = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      return reg
    } catch (err) {
      console.error('[push] SW register error:', err)
      return null
    }
  }, [])

  // ── Подписка на push ──────────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      // 1. Запросить разрешение
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPermissionState('denied')
        setShowPrompt(false)
        return false
      }
      setPermissionState('granted')

      // 2. Зарегистрировать SW
      const registration = await registerSW()
      if (!registration) throw new Error('SW not registered')

      // 3. Подписаться на push
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) throw new Error('VAPID public key not set')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const sub = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      // 4. Сохранить в БД
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) throw new Error('Failed to save subscription')

      localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true')
      setIsSubscribed(true)
      setShowPrompt(false)
      return true
    } catch (err) {
      console.error('[push] Subscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [registerSW])

  // ── Отписка ───────────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return true

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      await subscription.unsubscribe()
      localStorage.removeItem(PUSH_SUBSCRIBED_KEY)
      setIsSubscribed(false)
      setPermissionState('prompt')
      return true
    } catch (err) {
      console.error('[push] Unsubscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(PUSH_DISMISSED_KEY, String(Date.now()))
    setShowPrompt(false)
  }, [])

  return {
    permissionState,
    isSubscribed,
    showPrompt,
    isLoading,
    subscribe,
    unsubscribe,
    dismissPrompt,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const array = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i)
  }
  return array.buffer as ArrayBuffer
}
