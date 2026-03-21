'use client'

import { useEffect } from 'react'

/**
 * Trinity CRM — Auto-update Service Worker
 *
 * При обнаружении нового SW:
 * 1. Если пользователь НЕ активен (скрытая вкладка) — обновляем немедленно
 * 2. Если пользователь активен — ждём, пока он перейдёт на другую вкладку
 *    или открывает приложение снова (visibilitychange)
 *
 * Пользователь никогда не видит баннер — обновление происходит само.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let waitingWorker: ServiceWorker | null = null

    // Применяем обновление — заставляем новый SW взять управление и перезагружаем
    const applyUpdate = () => {
      if (!waitingWorker) return
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }

    // Слушаем смену контроллера (новый SW активировался) → перезагружаем страницу
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Проверяем обновление при каждом монтировании
        registration.update()

        const handleWaiting = (worker: ServiceWorker) => {
          waitingWorker = worker

          // Если вкладка скрыта (пользователь свернул/переключился) — обновляем сразу
          if (document.visibilityState === 'hidden') {
            applyUpdate()
            return
          }

          // Иначе — обновляем при следующем скрытии вкладки (уход из приложения)
          const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              document.removeEventListener('visibilitychange', onVisibilityChange)
              applyUpdate()
            }
          }
          document.addEventListener('visibilitychange', onVisibilityChange)

          // Страховка: если пользователь так и не скрыл вкладку — обновляем через 60 сек
          setTimeout(() => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            applyUpdate()
          }, 60_000)
        }

        // Новый SW уже ждёт (был установлен ранее)
        if (registration.waiting) {
          handleWaiting(registration.waiting)
        }

        // Новый SW найден в процессе работы
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              handleWaiting(newWorker)
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  }, [])

  // Хук больше не возвращает updateAvailable — обновление автоматическое
  return {}
}
