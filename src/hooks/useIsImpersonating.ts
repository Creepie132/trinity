'use client'

import { useEffect, useState } from 'react'

/**
 * Возвращает true если текущий сеанс — impersonation.
 * Читает состояние через API /api/admin/impersonation-state (HttpOnly кука).
 */
export function useIsImpersonating(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    fetch('/api/admin/impersonation-state')
      .then(r => r.json())
      .then(data => { if (data.active) setActive(true) })
      .catch(() => {})
  }, [])

  return active
}