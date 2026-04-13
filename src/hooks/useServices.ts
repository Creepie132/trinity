/**
 * useServices — Trinity CRM
 *
 * CRUD для услуг с полным Optimistic UI через useOptimisticMutation v2.
 * Кэш плоский (Service[]), не paged — хук обрабатывает оба шейпа.
 *
 * Realtime-синхронизация: GlobalRealtimeProvider (table: 'services').
 * Здесь нет Supabase-подписок — Rule 1.
 *
 * @version 2.1.0 — мигрировано на useOptimisticMutation v2 (type/toOptimistic API)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-fetch'
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation'
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '@/types/services'

// ─── Query key ────────────────────────────────────────────────────────────────

export const servicesKeys = {
  all:  () => ['services'] as const,
  list: () => ['services'] as const,
}

const SERVICES_KEY = servicesKeys.all()

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

// ─── useCreateService — OPTIMISTIC ───────────────────────────────────────────

export function useCreateService() {
  return useOptimisticMutation<Service, CreateServiceDTO>({
    queryKey: SERVICES_KEY,
    type: 'insert',

    mutationFn: async (dto) => {
      const data = await apiFetch<{ service: Service }>('/api/services', {
        method: 'POST',
        json: dto,
      })
      return data.service
    },

    toOptimistic: (dto): Partial<Service> => ({
      org_id:           '',
      name:             dto.name,
      name_ru:          dto.name_ru,
      duration_minutes: dto.duration_minutes ?? 0,
      price:            dto.price,
      color:            dto.color ?? '#6366f1',
      is_active:        true,
    }),

    messages: {
      success: 'השירות נוסף בהצלחה',
      error:   'שגיאה ביצירת שירות',
    },
  })
}

// ─── useUpdateService — OPTIMISTIC ───────────────────────────────────────────

export function useUpdateService() {
  return useOptimisticMutation<Service, { id: string } & UpdateServiceDTO>({
    queryKey: SERVICES_KEY,
    type: 'update',

    mutationFn: async ({ id, ...updates }) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'PATCH',
        json: updates,
      })
      return data.service
    },

    toOptimistic: ({ id: _id, ...updates }): Partial<Service> => updates,

    messages: {
      success: 'השירות עודכן בהצלחה',
      error:   'שגיאה בעדכון שירות',
    },
  })
}

// ─── useDeleteService — OPTIMISTIC ───────────────────────────────────────────

export function useDeleteService() {
  return useOptimisticMutation<Service, { id: string }>({
    queryKey: SERVICES_KEY,
    type: 'delete',

    mutationFn: async ({ id }) => {
      const data = await apiFetch<{ service: Service }>(`/api/services/${id}`, {
        method: 'DELETE',
      })
      return data.service
    },

    messages: {
      success: 'השירות נמחק בהצלחה',
      error:   'שגיאה במחיקת שירות',
    },
  })
}
