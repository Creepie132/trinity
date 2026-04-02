/**
 * useOptimisticMutation — Trinity CRM Optimistic UI Standard
 *
 * Единая обёртка над useMutation из React Query.
 * Инкапсулирует весь boilerplate: snapshot → optimistic apply → rollback → invalidate → toast.
 *
 * Это ядро Optimistic UI системы Trinity. Все CRUD-мутации должны использовать его.
 *
 * @version 1.0.0
 * @see docs/OPTIMISTIC_UI.md
 *
 * Пример использования:
 *   const mutation = useOptimisticMutation({
 *     queryKey: ['services'],
 *     mutationFn: (data) => apiFetch('/api/services', { method: 'POST', json: data }),
 *     applyOptimistic: (old, vars) => [buildOptimistic(vars), ...(old ?? [])],
 *     messages: { success: 'Услуга создана', error: 'Ошибка создания' },
 *   })
 */

'use client'

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Стратегии применения optimistic update:
 *
 * 'setQueryData'     — один ключ, getQueryData → setQueryData
 * 'setQueriesData'   — все ключи по префиксу, getQueriesData → setQueriesData
 */
export type OptimisticStrategy = 'setQueryData' | 'setQueriesData'

export interface OptimisticMessages {
  /** Toast при успехе — если не задан, тост не показывается */
  success?: string
  /** Префикс Toast при ошибке. Итоговый текст: `${error} ${err.message}` */
  error?: string
}

export interface UseOptimisticMutationOptions<
  TData,
  TError extends Error,
  TVariables,
  TCacheData = unknown,
> {
  /**
   * React Query ключ кэша, который нужно обновить оптимистично.
   * При strategy='setQueryData'  — точный ключ.
   * При strategy='setQueriesData' — ключ-префикс (все под-ключи).
   */
  queryKey: QueryKey

  /** Основной запрос к серверу */
  mutationFn: (variables: TVariables) => Promise<TData>

  /**
   * Функция применения optimistic update к текущему кэшу.
   * Возвращает новый кэш.
   *
   * @param current — текущее значение кэша (может быть undefined при первой загрузке)
   * @param variables — аргументы мутации
   * @returns обновлённый кэш
   */
  applyOptimistic: (current: TCacheData | undefined, variables: TVariables) => TCacheData

  /**
   * Стратегия обновления кэша.
   * @default 'setQueriesData' — охватывает все варианты queryKey (с фильтрами, страницами и т.д.)
   */
  strategy?: OptimisticStrategy

  /**
   * Дополнительные ключи для инвалидации в onSettled.
   * queryKey инвалидируется всегда, это — дополнительные.
   */
  invalidateKeys?: QueryKey[]

  /** Toast-сообщения */
  messages?: OptimisticMessages

  /**
   * Дополнительные хуки жизненного цикла (опционально).
   * НЕ перекрывают основную логику — выполняются ПОСЛЕ неё.
   */
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  onSettled?: () => void
}

// ─── Snapshot type — унифицирован для обоих стратегий ────────────────────────

type Snapshot<TCacheData> =
  | { strategy: 'setQueryData'; data: TCacheData | undefined }
  | { strategy: 'setQueriesData'; data: [QueryKey, TCacheData | undefined][] }

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOptimisticMutation<
  TData,
  TVariables,
  TCacheData = unknown,
  TError extends Error = Error,
>(options: UseOptimisticMutationOptions<TData, TError, TVariables, TCacheData>) {
  const {
    queryKey,
    mutationFn,
    applyOptimistic,
    strategy = 'setQueriesData',
    invalidateKeys = [],
    messages,
    onSuccess: userOnSuccess,
    onError: userOnError,
    onSettled: userOnSettled,
  } = options

  const qc = useQueryClient()

  return useMutation<TData, TError, TVariables, { snapshot: Snapshot<TCacheData> }>({
    mutationFn,

    // ── 1. onMutate: снимок + мгновенное применение ───────────────────────
    onMutate: async (variables) => {
      // Отменяем исходящие рефетчи — не перезаписать наш optimistic update
      await qc.cancelQueries({ queryKey })

      let snapshot: Snapshot<TCacheData>

      if (strategy === 'setQueryData') {
        const previous = qc.getQueryData<TCacheData>(queryKey)
        snapshot = { strategy: 'setQueryData', data: previous }

        qc.setQueryData<TCacheData>(queryKey, (old) => applyOptimistic(old, variables))
      } else {
        // setQueriesData — охватывает все вариации ключа (с параметрами, страницами)
        const entries = qc.getQueriesData<TCacheData>({ queryKey })
        snapshot = { strategy: 'setQueriesData', data: entries }

        qc.setQueriesData<TCacheData>(
          { queryKey },
          (old) => applyOptimistic(old, variables)
        )
      }

      return { snapshot }
    },

    // ── 2. onError: жёсткий откат + toast ────────────────────────────────
    onError: (error, variables, context) => {
      if (context?.snapshot) {
        const { snapshot } = context

        if (snapshot.strategy === 'setQueryData') {
          qc.setQueryData(queryKey, snapshot.data)
        } else {
          snapshot.data.forEach(([key, data]) => qc.setQueryData(key, data))
        }
      }

      if (messages?.error) {
        toast.error(`${messages.error}: ${error.message}`)
      }

      userOnError?.(error, variables)
    },

    // ── 3. onSettled: фоновая сверка с БД ────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey })
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key })
      }
      userOnSettled?.()
    },

    // ── 4. onSuccess: toast успех + user hook ─────────────────────────────
    onSuccess: (data, variables) => {
      if (messages?.success) {
        toast.success(messages.success)
      }
      userOnSuccess?.(data, variables)
    },
  })
}
