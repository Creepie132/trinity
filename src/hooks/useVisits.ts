'use client'

/**
 * useVisits — Trinity Standard hook для визитов.
 *
 * Zero Trust: запросы только через /api/visits/list (сервер проверяет orgId).
 * Нет прямых вызовов supabase.from() на клиенте.
 *
 * staleTime: 30_000 — данные свежи 30 сек.
 * placeholderData: keepPreviousData — нет мигания при смене фильтров.
 * Optimistic updates на useUpdateVisitStatus — мгновенный отклик UI.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useBranch } from '@/contexts/BranchContext'
import { toast } from 'sonner'
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

  return useQuery<VisitsResult>({
    queryKey: visitsKeys.list(activeOrgId, {
      dateFilter, statusFilter, eventTypeFilter,
      search, page, pageSize,
    }),
    queryFn: async () => {
      const sp = new URLSearchParams({
        dateFilter,
        statusFilter,
        eventTypeFilter,
        page:     String(page),
        pageSize: String(pageSize),
      })
      if (search && search.length >= 2) sp.set('search', search)

      const res = await fetch(`/api/visits/list?${sp.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch visits')
      }
      return res.json() as Promise<VisitsResult>
    },
    enabled:         !!activeOrgId,
    staleTime:       30_000,
    placeholderData: keepPreviousData,
  })
}

// ── Status update mutation — OPTIMISTIC ───────────────────────────────────────

export interface UpdateVisitStatusParams {
  id:     string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  /** started_at для статуса in_progress (ISO string) */
  started_at?: string
}

export function useUpdateVisitStatus() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async ({ id, status }: UpdateVisitStatusParams) => {
      const res = await fetch(`/api/visits/${id}/status`, {
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

    // ── 1. onMutate: мгновенное обновление кэша ──────────────────────────────
    onMutate: async ({ id, status, started_at }) => {
      // Отменяем все исходящие запросы — чтобы они не перезаписали optimistic update
      await qc.cancelQueries({ queryKey: visitsKeys.all(activeOrgId) })

      // Снимок всех закэшированных списков визитов для rollback
      const snapshot = qc.getQueriesData<VisitsResult>({
        queryKey: visitsKeys.all(activeOrgId),
      })

      // Обновляем статус визита во всех активных кэшах списков
      qc.setQueriesData<VisitsResult>(
        { queryKey: visitsKeys.all(activeOrgId) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((v) =>
              v.id === id
                ? {
                    ...v,
                    status,
                    ...(status === 'in_progress' && {
                      started_at: started_at ?? new Date().toISOString(),
                    }),
                  }
                : v
            ),
          }
        }
      )

      return { snapshot }
    },

    // ── 2. onError: откат до сохранённого снимка ─────────────────────────────
    onError: (err: any, _vars, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
      toast.error(err.message || 'Ошибка обновления статуса')
    },

    // ── 3. onSettled: фоновая сверка с БД ────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: visitsKeys.all(activeOrgId) })
    },
  })
}


// ── Create visit mutation ─────────────────────────────────────────────────────

export interface CreateVisitPayload {
  clientId:     string
  serviceId?:   string | null
  service?:     string
  date:         string
  time:         string
  duration?:    number | null
  price?:       string | number
  quantity?:    number
  notes?:       string
  event_type?:  'visit' | 'meeting'
  meeting_link?: string | null
}

export function useCreateVisit() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (payload: CreateVisitPayload) => {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create visit')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitsKeys.all(activeOrgId) })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Ошибка создания визита')
    },
  })
}

// ── Update visit mutation ─────────────────────────────────────────────────────

export interface UpdateVisitPayload {
  id:               string
  scheduled_at?:    string
  service_id?:      string | null
  duration_minutes?: number | null
  notes?:           string
  price?:           number | null
  meeting_link?:    string | null
}

export function useUpdateVisit() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateVisitPayload) => {
      const res = await fetch(`/api/visits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update visit')
      }
      return res.json()
    },
    // Optimistic update — мгновенно обновляем scheduled_at в UI
    onMutate: async ({ id, ...payload }) => {
      // Фильтруем optimistic IDs — никогда не пишем в БД temp ID
      if (id.startsWith('optimistic-')) {
        throw new Error('Cannot update visit with optimistic ID')
      }
      await qc.cancelQueries({ queryKey: visitsKeys.all(activeOrgId) })
      const snapshot = qc.getQueriesData<VisitsResult>({ queryKey: visitsKeys.all(activeOrgId) })
      qc.setQueriesData<VisitsResult>(
        { queryKey: visitsKeys.all(activeOrgId) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map(v =>
              v.id === id ? { ...v, ...payload } : v
            ),
          }
        }
      )
      return { snapshot }
    },
    onError: (err: any, _vars, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
      toast.error(err.message || 'Ошибка сохранения визита')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: visitsKeys.all(activeOrgId) })
    },
  })
}
