/// <reference lib="WebWorker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================
// Trinity CRM — Custom Worker (Push Notifications)
//
// ⚠️ ВАЖНО: @ducanh2912/next-pwa использует `customWorkerSrc`, а не `swSrc`.
// Этот файл НЕ заменяет SW целиком — он инжектируется плагином в основной
// сгенерированный /sw.js через importScripts. Весь Workbox precache/runtime
// caching остаётся как есть; мы только добавляем push-обработчики.
//
// Связь с src/sw.ts: src/sw.ts больше не используется (swSrc в @ducanh2912
// не поддерживается). Вся логика push-уведомлений теперь здесь.
// =============================================================

declare const self: ServiceWorkerGlobalScope

// ── Push notification arrival ─────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: {
    title?: string
    body?: string
    url?: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, unknown>
    requireInteraction?: boolean
    silent?: boolean
    actions?: Array<{ action: string; title: string }>
  } = {}

  try {
    data = event.data.json()
  } catch {
    // Payload не JSON — используем raw text как body
    try {
      data = { body: event.data.text() }
    } catch {
      data = {}
    }
  }

  const title = data.title ?? 'Trinity CRM'
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/icon-192.png',
    badge: data.badge ?? '/icons/badge-96.png',
    tag: data.tag ?? 'trinity-notification',
    data: {
      url: data.url ?? '/dashboard',
      ...(data.data ?? {}),
    },
    requireInteraction: data.requireInteraction ?? false,
    silent: data.silent ?? false,
    ...(data.actions ? { actions: data.actions } : {}),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click — focus existing tab or open new ──────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const targetUrl =
    (event.notification.data as { url?: string } | undefined)?.url ?? '/dashboard'

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Ищем уже открытую вкладку с этим URL
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url)
          const targetPath = targetUrl.startsWith('http')
            ? new URL(targetUrl).pathname
            : targetUrl

          if (clientUrl.pathname === targetPath && 'focus' in client) {
            return (client as WindowClient).focus()
          }
        } catch {
          // невалидный URL клиента — пропускаем
        }
      }

      // Ищем любую открытую вкладку Trinity — фокусируемся и навигируем
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          try {
            const focused = await (client as WindowClient).focus()
            await (focused as any).navigate?.(targetUrl)
            return focused
          } catch {
            // navigate может быть недоступен (cross-origin) — fallback ниже
          }
        }
      }

      // Нет открытых вкладок — открываем новую
      return self.clients.openWindow(targetUrl)
    })()
  )
})

// ── Push subscription change (когда браузер ротирует endpoint) ───────────
// Автоматически пытаемся переподписаться. Клиент при следующем открытии
// сохранит новую подписку через /api/push/subscribe (хук usePushNotifications
// делает re-subscribe на mount, если permission=granted).
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const e = event as any
  e.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe(
          e.oldSubscription?.options ?? { userVisibleOnly: true }
        )
        // Уведомляем все открытые клиенты, чтобы они отправили новую
        // подписку на бэкенд через /api/push/subscribe
        const clientList = await self.clients.matchAll({ type: 'window' })
        for (const client of clientList) {
          client.postMessage({
            type: 'TRINITY_PUSH_RESUBSCRIBED',
            subscription: newSub.toJSON(),
          })
        }
      } catch (err) {
        console.error('[Trinity SW] pushsubscriptionchange failed:', err)
      }
    })()
  )
})

export {}
