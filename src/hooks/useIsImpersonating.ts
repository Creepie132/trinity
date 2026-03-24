'use client'

import { useEffect, useState } from 'react'

/**
 * Возвращает true если текущий сеанс — impersonation (суперадмин смотрит от лица org).
 * Читает из localStorage — быстро, без запросов к серверу.
 */
export function useIsImpersonating(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem('impersonation_session')
      setActive(!!raw)
    }
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  return active
}
