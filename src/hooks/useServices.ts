/**
 * useServices — Trinity CRM
 *
 * CRUD для услуг с Optimistic UI.
 *
 * Кэш плоский: Service[] (не PagedCache). Поэтому хуки мутаций НЕ используют
 * общий useOptimisticMutation (он рассчитан на { data, count }) — реализуют
 * optimistic-логику локально через queryClient.setQueryData.
 *
 * Realtime-синхронизация: GlobalRealtimeProvider (table: 'services').
 *
 * @version 3.0.0 — мигрировано на плоский optimistic для Service[]
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '@/types/services'

// ─── Query key ────────────────────────────────────────────────────────────────

export const servicesKeys = {
  all:  () => ['services'] as const,
  list: () => ['services'] as const,
}

const SERVICES_KEY = servicesKeys.all()
const INVALIDATE_DELAY_MS = 2000

// ─── useServices ──────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery<Service[]>({
    queryKey: SERVICES_KEY,
    queryFn: async () => {
      const data = await apiFetch<{ services: Service[] }>('/api/services')
      return data.services
    },
    staleTime: 30_000,
  })
}

// ─── useCreateService — OPTIMISTIC (flat array) ───────────────────────────────

export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation<Service, Error, CreateServiceDTO, { previous: Service[] | undefined; tempId: string }>({
    mutationFn: async (dto) => {
      const data = await apiFetch<{ service: Service }>('/api/services', {
        method: 'POST',
        json: dto,
      })
      return data.service
    },

    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: SERVICES_KEY })
      const previous = queryClient.getQueryData<Service[]>(SERVICES_KEY)

      const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const optimistic: Service = {
        id: tempId,
        org_id: '',
        name: dto.name,
        name_ru: dto.name_ru,
        price: dto.price,
        duration_minutes: dto.duration_minutes ?? 60,
        color: dto.color ?? '#6366f1',
        is_active: true,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Service[]>(SERVICES_KEY, (old) => {
        return [optimistic, ...(old ?? [])]
      })

      return { previous, tempId }
    },

    onSuccess: (serverData, _dto, context) => {
      // Swap temp UUID with server UUID
      queryClient.setQueryData<Service[]>(SERVICES_KEY, (old) => {
        if (!old) return old
        return old.map((s) => (s.id === context.tempId ? serverData : s))
      })
      toast.success('השירות נוסף בהצלחה')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: SERVICES_KEY, exact: false })
      }, INVALIDATE_DELAY_MS)
    },

    onError: (error, _dto, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Service[]>(SERVICES_KEY, context.previous)
      }
      toast.error(error.message || 'שגיאה ביצירת שירות')
    },
  })
}

// ─── useUpdateService — OPTIMISTIC (flat array) ───────────────────────────────

export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation<Service, Error, { id: string } & UpdateServiceDTO, { previous: Service[] | undefined }>({
    mutationFn: async ({ id, ...updates }) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'PATCH',
        json: updates,
      })
      return data.service
    },

    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: SERVICES_KEY })
      const previous = queryClient.getQueryData<Service[]>(SERVICES_KEY)

      queryClient.setQueryData<Service[]>(SERVICES_KEY, (old) => {
        if (!old) return old
        return old.map((s) => (s.id === id ? { ...s, ...updates } as Service : s))
      })

      return { previous }
    },

    onSuccess: () => {
      toast.success('השירות עודכן בהצלחה')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: SERVICES_KEY, exact: false })
      }, INVALIDATE_DELAY_MS)
    },

    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Service[]>(SERVICES_KEY, context.previous)
      }
      toast.error(error.message || 'שגיאה בעדכון שירות')
    },
  })
}

// ─── useDeleteService — OPTIMISTIC (flat array) ───────────────────────────────

export function useDeleteService() {
  const queryClient = useQueryClient()

  return useMutation<Service, Error, { id: string }, { previous: Service[] | undefined }>({
    mutationFn: async ({ id }) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'DELETE',
      })
      return data.service
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: SERVICES_KEY })
      const previous = queryClient.getQueryData<Service[]>(SERVICES_KEY)

      queryClient.setQueryData<Service[]>(SERVICES_KEY, (old) => {
        if (!old) return old
        return old.filter((s) => s.id !== id)
      })

      return { previous }
    },

    onSuccess: () => {
      toast.success('השירות נמחק בהצלחה')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: SERVICES_KEY, exact: false })
      }, INVALIDATE_DELAY_MS)
    },

    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Service[]>(SERVICES_KEY, context.previous)
      }
      toast.error(error.message || 'שגיאה במחיקת שירות')
    },
  })
}
