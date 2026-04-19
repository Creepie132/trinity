'use client'

/**
 * Хук для работы с предпочтительной "главной" страницей пользователя.
 *
 * Синхронизация Web ↔ PWA достигается автоматически: хук читает и пишет
 * в /api/mobile/preferences, который хранит данные в user_nav_preferences
 * (per user_id), поэтому любое устройство того же юзера видит актуальное
 * значение после fetch.
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFeatures } from './useFeatures'
import {
  LANDING_PAGE_OPTIONS,
  DEFAULT_LANDING_ID,
  DEFAULT_LANDING_PATH,
  resolveLandingPath,
  type LandingPageOption,
} from '@/lib/landing-pages'

interface PreferencesPayload {
  nav_tabs: string[]
  default_landing_page: string
  updated_at: string | null
}

async function fetchPreferences(): Promise<PreferencesPayload> {
  const res = await fetch('/api/mobile/preferences', {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to load preferences: ${res.status}`)
  return res.json()
}

async function savePreferences(landingId: string): Promise<void> {
  const res = await fetch('/api/mobile/preferences', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ default_landing_page: landingId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `Save failed: ${res.status}`)
  }
}

export interface UseLandingPageResult {
  /** id выбранной страницы (из БД). Пока не загружено — 'dashboard'. */
  landingId: string
  /** path для router.push / Link href. Учитывает отключённые модули. */
  landingPath: string
  /** Список опций, доступных этому пользователю (отфильтрован по useFeatures). */
  availableOptions: LandingPageOption[]
  /** Загрузка исходного значения из API */
  isLoading: boolean
  /** Сохранение идёт прямо сейчас */
  isSaving: boolean
  /** Ошибка последнего сохранения (если была) */
  saveError: Error | null
  /** Сохранить выбор. Мгновенно обновляет локальный кэш. */
  setLanding: (landingId: string) => Promise<void>
}

export function useLandingPage(): UseLandingPageResult {
  const qc = useQueryClient()
  const features = useFeatures()

  const { data, isLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchPreferences,
    staleTime: 60_000,
    // preferences редко меняются — не дёргать при каждом фокусе окна
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: savePreferences,
    onMutate: async (newId) => {
      await qc.cancelQueries({ queryKey: ['user-preferences'] })
      const prev = qc.getQueryData<PreferencesPayload>(['user-preferences'])
      if (prev) {
        qc.setQueryData<PreferencesPayload>(['user-preferences'], {
          ...prev,
          default_landing_page: newId,
        })
      }
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      // откат
      if (ctx?.prev) qc.setQueryData(['user-preferences'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })

  const landingId = data?.default_landing_page ?? DEFAULT_LANDING_ID

  const landingPath = useMemo(
    () => resolveLandingPath(landingId, features),
    [landingId, features]
  )

  const availableOptions = useMemo(() => {
    // пока фичи грузятся — показываем только дашборд, чтобы не мигать списком
    if (features.isLoading) return LANDING_PAGE_OPTIONS.filter((o) => o.featureFlag === null)
    return LANDING_PAGE_OPTIONS.filter((opt) => {
      if (opt.featureFlag === null) return true
      return features[opt.featureFlag] === true
    })
  }, [features])

  return {
    landingId,
    landingPath: landingPath || DEFAULT_LANDING_PATH,
    availableOptions,
    isLoading,
    isSaving: mutation.isPending,
    saveError: (mutation.error as Error | null) ?? null,
    setLanding: async (id: string) => {
      await mutation.mutateAsync(id)
    },
  }
}
