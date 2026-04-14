'use client'

// ⚡ PWA Service Worker registration
// Регистрируем SW только в продакшне и только в браузере.
// Workbox-стратегии определены в /public/sw.js
// Этот компонент монтируется один раз в root layout.

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Проверяем обновления раз в 60 секунд (активная сессия)
        setInterval(() => reg.update(), 60_000)
      })
      .catch((err) => {
        // SW-ошибки не должны ломать приложение
        console.warn('[Trinity PWA] SW registration failed:', err)
      })
  }, [])

  return null
}
