// Trinity CRM — Service Worker
// Handles push notifications and offline caching

const CACHE_NAME = 'trinity-v1'

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => clients.claim())
  )
})

// ─── Message (SKIP_WAITING) ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── Push received ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Trinity CRM', body: event.data.text() }
  }

  const title = data.title || 'Trinity CRM'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'trinity-notification',
    data: {
      url: data.url || '/dashboard',
      ...data.data,
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'he',
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если приложение уже открыто — фокусируемся
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Иначе открываем новую вкладку
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ─── Notification close ────────────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Можно логировать dismissed-уведомления
})
