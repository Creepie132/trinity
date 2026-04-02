/**
 * useServices — Trinity CRM
 *
 * PoC-внедрение стандарта useOptimisticMutation.
 * Все CRUD-операции мгновенны: UI обновляется до ответа сервера.
 * При ошибке — автоматический откат + toast.
 *
 * Миграция с предыдущей версии:
 *   Было: ручные onMutate/onError/onSettled + toast в каждой функции
 *   Стало: useOptimisticMutation с applyOptimistic
 *
 * @version 2.0.0
 */

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api-fetch'
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation'
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '@/types/services'

// ─── Query key factory ────────────────────────────────────────────────────────

export const servicesKeys = {
  all:  () => ['services'] as const,
  list: () => ['services'] as const,
}

// ── Константа ключа (используется во всех хуках) ─────────────────────────────
const SERVICES_KEY = servicesKeys.all()

// ─── useServices ──────────────────────────────────────────────────────────────

export function useServices() {
  // NOTE: useRealtimeSync intentionally removed from here.
  // useServices is called from multiple components simultaneously — creating
  // duplicate Supabase Realtime channels. RT subscription lives in DashboardShell.
  return useQuery<Service[]>({
    queryKey: SERVICES_KEY,
    queryFn: async () => {
      const data = await apiFetch<{ services: Service[] }>('/api/services')
      return data.services
    },
    staleTime: 30_000,
  })
}

// ─── useCreateService — OPTIMISTIC ───────────────────────────────────────────

export function useCreateService() {
  return useOptimisticMutation<Service, CreateServiceDTO, Service[]>({
    queryKey: SERVICES_KEY,

    mutationFn: async (dto) => {
      const data = await apiFetch<{ service: Service }>('/api/services', {
        method: 'POST',
        json: dto,
      })
      return data.service
    },

    /**
     * applyOptimistic: добавляем новую услугу в начало списка с временным ID.
     * Optimistic-запись будет заменена реальной данными после onSettled → invalidate.
     */
    applyOptimistic: (old, dto) => {
      const optimistic: Service = {
        id:               `optimistic-${Date.now()}`,
        org_id:           '',              // сервер заполнит через auth context
        name:             dto.name,
        name_ru:          dto.name_ru,
        duration_minutes: dto.duration_minutes ?? 0,
        price:            dto.price,
        color:            dto.color ?? '#6366f1',
        is_active:        true,
        created_at:       new Date().toISOString(),
      }
      return [optimistic, ...(old ?? [])]
    },

    messages: {
      success: 'השירות נוסף בהצלחה',
      error:   'שגיאה ביצירת שירות',
    },
  })
}

// ─── useUpdateService — OPTIMISTIC ───────────────────────────────────────────

export function useUpdateService() {
  return useOptimisticMutation<
    Service,
    { id: string; updates: UpdateServiceDTO },
    Service[]
  >({
    queryKey: SERVICES_KEY,

    mutationFn: async ({ id, updates }) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'PATCH',
        json: updates,
      })
      return data.service
    },

    /**
     * applyOptimistic: patch только изменённые поля, остальное — как было.
     */
    applyOptimistic: (old, { id, updates }) =>
      old?.map(s =>
        s.id === id
          ? { ...s, ...updates, updated_at: new Date().toISOString() }
          : s
      ) ?? [],

    messages: {
      success: 'השירות עודכן בהצלחה',
      error:   'שגיאה בעדכון שירות',
    },
  })
}

// ─── useDeleteService — OPTIMISTIC ───────────────────────────────────────────

export function useDeleteService() {
  return useOptimisticMutation<Service, string, Service[]>({
    queryKey: SERVICES_KEY,

    mutationFn: async (id) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'DELETE',
      })
      return data.service
    },

    /**
     * applyOptimistic: убираем услугу из списка немедленно.
     * При ошибке rollback вернёт её обратно.
     */
    applyOptimistic: (old, id) =>
      old?.filter(s => s.id !== id) ?? [],

    messages: {
      success: 'השירות נמחק בהצלחה',
      error:   'שגיאה במחיקת שירות',
    },
  })
}
