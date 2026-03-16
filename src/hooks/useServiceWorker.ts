'use client'

import { useEffect, useState } from 'react'

export function useServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates every time page loads
        registration.update()

        // New SW is already waiting to activate
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setUpdateAvailable(true)
        }

        // SW found during update check
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker)
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    setUpdateAvailable(false)
    window.location.reload()
  }

  return { updateAvailable, applyUpdate }
}
