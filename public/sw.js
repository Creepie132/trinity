// ============================================================
// Trinity CRM — Service Worker (Workbox via workbox-window)
// Стратегии:
//   CacheFirst     — статика Next.js (_next/static), шрифты, иконки
//   StaleWhileRevalidate — API GET-запросы (мгновенный ответ из кэша + фоновое обновление)
//   NetworkFirst   — навигация (HTML-страницы) — всегда свежие, fallback на кэш
// ============================================================

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Немедленно берём управление всеми вкладками без ожидания перезагрузки
clientsClaim()

// Precache — Next.js автоматически подставит список через next-pwa/инжект
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── 1. Навигация (HTML-страницы) — NetworkFirst с fallback ────────────────
// Берём свежую версию из сети, если сеть недоступна → кэш
const navigationHandler = new NetworkFirst({
  cacheName: 'trinity-pages',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
  ],
})
registerRoute(new NavigationRoute(navigationHandler, {
  // НЕ кэшируем API-роуты как навигацию
  denylist: [/^\/api\//],
}))

// ── 2. Статика Next.js (_next/static) — CacheFirst, 1 год ────────────────
// JS/CSS бандлы хешированы → иммутабельны → всегда из кэша
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: 'trinity-static',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// ── 3. Шрифты Google (если используются через CDN) — CacheFirst ───────────
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.gstatic.com' ||
    url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'trinity-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// ── 4. Изображения из /public — CacheFirst, 30 дней ──────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'trinity-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// ── 5. API GET — StaleWhileRevalidate ────────────────────────────────────
// Мгновенный ответ из кэша прошлой сессии + тихое обновление в фоне.
// Только безопасные GET: dashboard, clients, visits, payments, notifications.
// POST/PATCH/DELETE — НЕ кэшируются (никогда).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth') &&
    !url.pathname.startsWith('/api/mobile/auth'),
  new StaleWhileRevalidate({
    cacheName: 'trinity-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 64,
        // API-данные живут не более 5 минут — потом всё равно идём в сеть
        maxAgeSeconds: 5 * 60,
      }),
    ],
  })
)

// ── Push-уведомления ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Trinity CRM', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/dashboard' },
      tag: 'trinity-notification',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const found = clients.find((c) => c.url.includes(url))
      if (found) return found.focus()
      return self.clients.openWindow(url)
    })
  )
})
