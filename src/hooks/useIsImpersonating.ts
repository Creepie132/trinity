'use client'

import { useEffect, useState } from 'react'

function readImpersonating(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('impersonation_session')
}

/**
 * Возвращает true если текущий сеанс — impersonation (суперадмин смотрит от лица org).
 * Инициализируется синхронно из localStorage — кнопка видна сразу при открытии модалки.
 */
export function useIsImpersonating(): boolean {
  // Инициализация синхронно — никакого flash/задержки
  const [active, setActive] = useState<boolean>(readImpersonating)

  useEffect(() => {
    // Актуализируем при изменениях из других вкладок
    const check = () => setActive(readImpersonating())
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  return active
}
