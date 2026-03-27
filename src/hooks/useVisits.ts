'use client'

/**
 * useVisits — Trinity Standard hook для визитов.
 *
 * Zero Trust: запросы только через /api/visits/list (сервер проверяет orgId).
 * Нет прямых вызовов supabase.from() на клиенте.
 *
 * staleTime: 30_000 — данные свежи 30 сек, нет лишних refetch при фокусе.
 * placeholderData: keepPreviousData — нет мигания при смене фильтров.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Visit } from '@/types/visits'

// ── Filter types ──────────────────────────────────────────────────────────────

export type VisitDateFilter      = 'today' | 'week' | 'month' | 'all'
export type VisitStatusFilter    = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type VisitEventTypeFilter = 'all' | 'visit' | 'meeting'

export interface UseVisitsParams {
  dateFilter?:      VisitDateFilter
  statusFilter?:    VisitStatusFilter
  eventTypeFilter?: VisitEventTypeFilter
  search?:          string
  page?:            number
  pageSize?:        number
}

export interface VisitsResult {
  data:     Visit[]
  count:    number
  page:     number
  pageSize: number
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const visitsKeys = {
  all:  (orgId: string | undefined) =>
          ['visits', orgId] as const,
  list: (orgId: string | undefined, params: UseVisitsParams) =>
          ['visits', orgId, params] as const,
}

// ── Main hook ─────────────────────────────────────────────────────────────────

/**
 * useVisits — основной хук листинга.
 *
 * Realtime: ONE channel в DashboardShell (не здесь) — чтобы не дублировать
 * подписки при параллельных вызовах.
 */
export function useVisits(params: UseVisitsParams = {}) {
  const { activeOrgId } = useBranch()
  const {
    dateFilter      = 'week',
    statusFilter    = 'all',
    eventTypeFilter = 'all',
    search          = '',
    page            = 1,
    pageSize        = 30,
  } = params

  // Debounced search не нужен здесь — caller передаёт уже debounced значение
  const debouncedSearch = search

  return useQuery<VisitsResult>({
    queryKey: visitsKeys.list(activeOrgId, {
      dateFilter, statusFilter, eventTypeFilter,
      search: debouncedSearch, page, pageSize,
    }),
    queryFn: async () => {
      const sp = new URLSearchParams({
        dateFilter,
        statusFilter,
        eventTypeFilter,
        page:     String(page),
        pageSize: String(pageSize),
      })
      if (debouncedSearch && debouncedSearch.length >= 2) {
        sp.set('search', debouncedSearch)
      }

      const res = await fetch(`/api/visits/list?${sp.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch visits')
      }
      return res.json() as Promise<VisitsResult>
    },
    enabled:         !!activeOrgId,
    staleTime:       30_000,
    placeholderData: keepPreviousData,   // нет мигания при смене фильтров
  })
}

// ── Status update mutation ────────────────────────────────────────────────────

export interface UpdateVisitStatusParams {
  id:     string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
}

export function useUpdateVisitStatus() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async ({ id, status }: UpdateVisitStatusParams) => {
      const res = await fetch(`/api/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update visit status')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitsKeys.all(activeOrgId) })
    },
  })
}
