import { useEffect, useRef } from 'react'

const HEARTBEAT_INTERVAL = 30_000 // 30 seconds

/**
 * Sends a heartbeat to /api/worker/heartbeat every 30 seconds.
 * Used to track online presence of sales agents.
 * Mount this hook in the worker layout.
 */
export function useHeartbeat() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ping = async () => {
    try {
      await fetch('/api/worker/heartbeat', { method: 'POST' })
    } catch {
      // silent — non-critical
    }
  }

  useEffect(() => {
    // ping immediately on mount
    ping()
    timerRef.current = setInterval(ping, HEARTBEAT_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
}
