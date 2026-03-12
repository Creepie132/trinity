/**
 * useBranchFetch — обёртка над fetch, добавляет X-Branch-Org-Id заголовок.
 * Используется во всех хуках которые должны переключаться при смене филиала.
 *
 * Клиенты — НЕ используют этот хук (всегда mainOrgId).
 */
'use client'

import { useBranch } from '@/contexts/BranchContext'
import { useCallback } from 'react'

export function useBranchFetch() {
  const { activeOrgId } = useBranch()

  const branchFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      if (!activeOrgId) return fetch(url, options)

      const headers = new Headers(options.headers || {})
      headers.set('X-Branch-Org-Id', activeOrgId)

      return fetch(url, { ...options, headers })
    },
    [activeOrgId]
  )

  return { branchFetch, activeOrgId }
}
