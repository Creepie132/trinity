/// <reference lib="WebWorker" />
// =============================================================
// Trinity CRM — Custom Service Worker
// Используется как swSrc в @ducanh2912/next-pwa.
// next-pwa инжектирует self.__WB_MANIFEST автоматически при сборке.
//
// Стратегии:
//   Precache             — весь _next/static/* (JS/CSS, хешированные)
//   NetworkFirst         — HTML-навигация (3с таймаут → fallback кэш)
//   CacheFirst           — шрифты, изображения
//   StaleWhileRevalidate — GET /api/* (мгновенный кэш + фон. обновление)
//
// НЕ кэшируем: POST/PATCH/DELETE, /api/auth/*, /api/mobile/auth, /api/webhooks
// =============================================================

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ── Берём управление сразу, без ожидания перезагрузки ────────────────────
// skipWaiting() вставляется next-pwa автоматически (skipWaiting: true)
clientsClaim()

// ── Precache — next-pwa подставит реальный список хешированных файлов ────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── 1. HTML-навигация — NetworkFirst ─────────────────────────────────────
const navigationHandler = new NetworkFirst({
  cacheName: 'trinity-pages-v1',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
  ],
})

registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//],
  })
)

// ── 2. Шрифты Google — CacheFirst, 1 год ─────────────────────────────────
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.gstatic.com' ||
    url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'trinity-fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// ── 3. Изображения — CacheFirst, 30 дней ─────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'trinity-images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// ── 4. API GET — StaleWhileRevalidate ─────────────────────────────────────
// Мгновенный ответ из кэша прошлой сессии + фоновое обновление.
// TTL 5 мин — баланс между свежестью и скоростью.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth') &&
    !url.pathname.startsWith('/api/mobile/auth') &&
    !url.pathname.startsWith('/api/webhooks'),
  new StaleWhileRevalidate({
    cacheName: 'trinity-api-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 5 * 60 }),
    ],
  })
)

// ── 5. Push-уведомления ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const pushEvent = event as PushEvent
  if (!pushEvent.data) return
  let data: { title?: string; body?: string; url?: string }
  try { data = pushEvent.data.json() } catch { data = {} }

  pushEvent.waitUntil(
    self.registration.showNotification(data.title ?? 'Trinity CRM', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/dashboard' },
      tag: 'trinity-notification',
    } as NotificationOptions)
  )
})

// ── 6. Клик по уведомлению ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const notifEvent = event as NotificationEvent
  notifEvent.notification.close()
  const targetUrl: string = (notifEvent.notification.data as { url?: string })?.url ?? '/dashboard'

  notifEvent.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(targetUrl))
      if (existing) return (existing as WindowClient).focus()
      return self.clients.openWindow(targetUrl)
    })
  )
})
