'use client'

/**
 * useOptimisticMutation — Trinity CRM universal optimistic mutation hook.
 *
 * Implements all 5 Trinity reactivity rules:
 *   Rule 1: No Realtime subscriptions here — only cache surgery.
 *   Rule 2: Full snapshot via getQueriesData → rollback via setQueriesData.
 *   Rule 3: Debounced invalidation 2s after success (Realtime gets priority).
 *   Rule 4: org_id filter is enforced at subscription level (in GlobalRealtimeProvider).
 *   Rule 5: On INSERT success — swap optimistic UUID for real server UUID in cache.
 *
 * Usage:
 *   const add = useOptimisticMutation<ClientSummary, AddClientInput>({
 *     queryKey: ['clients'],
 *     type: 'insert',
 *     mutationFn: (data) => apiFetch('/api/clients', { method: 'POST', json: data }),
 *     toOptimistic: (input) => ({ ...input, total_visits: 0, total_paid: 0 }),
 *     messages: { success: 'Клиент добавлен', error: 'Ошибка' },
 *   })
 *   add.mutate(formData)
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MutationType = 'insert' | 'update' | 'delete'

/** Shape every cached list page must conform to for surgery to work. */
export interface PagedCache<T> {
  data: T[]
  count: number
}

export interface OptimisticMutationOptions<
  TData extends { id: string },
  TInput,
> {
  /**
   * TanStack Query key prefix — used for both getQueriesData (snapshot)
   * and setQueriesData (optimistic write + rollback).
   * Must be the same prefix used in the corresponding useQuery().
   * Example: ['clients'] — will match ['clients', orgId, search, page, ...]
   */
  queryKey: QueryKey

  /** Operation type — determines the merge strategy applied to the cache. */
  type: MutationType

  /**
   * The actual API call. Must return the persisted server record (with real UUID).
   * Called AFTER the optimistic cache update, in parallel with user seeing the result.
   */
  mutationFn: (input: TInput) => Promise<TData>

  /**
   * Converts mutation input → optimistic cache record (for insert/update).
   * MUST be provided for insert/update. Not used for delete.
   *
   * For insert: return a partial record — id will be overwritten with 'optimistic-<ts>'.
   * For update: return only the fields being changed (merged over existing row).
   */
  toOptimistic?: (input: TInput) => Partial<TData>

  /** User-visible toast messages. */
  messages?: {
    success?: string
    error?: string
  }

  /**
   * Delay in ms before the fallback invalidateQueries fires.
   * Default: 2000ms — gives Realtime 50-200ms to deliver the real row,
   * then waits for any animation/transition before forcing a re-fetch.
   *
   * Set to 0 to invalidate immediately (disables Realtime-first behaviour).
   */
  invalidateDelayMs?: number

  /** Callbacks */
  onSuccess?: (data: TData, input: TInput) => void
  onError?: (error: Error, input: TInput) => void
}

// ── Internal context passed through TanStack mutation lifecycle ───────────────

interface MutationContext<TData extends { id: string }> {
  /** Deep snapshot of every matching cache entry before mutation */
  snapshot: [QueryKey, PagedCache<TData> | undefined][]
  /** Temporary ID injected into the cache for insert operations */
  optimisticId?: string
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOptimisticMutation<
  TData extends { id: string },
  TInput,
>(options: OptimisticMutationOptions<TData, TInput>) {
  const {
    queryKey,
    type,
    mutationFn,
    toOptimistic,
    messages,
    invalidateDelayMs = 2000,
    onSuccess,
    onError,
  } = options

  const queryClient = useQueryClient()

  return useMutation<TData, Error, TInput, MutationContext<TData>>({
    mutationFn,

    // ── RULE 2: Snapshot + Optimistic write ───────────────────────────────
    onMutate: async (input): Promise<MutationContext<TData>> => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic state
      await queryClient.cancelQueries({ queryKey })

      // Full snapshot of ALL matching cache entries (all pages, all filters)
      const snapshot = queryClient.getQueriesData<PagedCache<TData>>({ queryKey })

      let optimisticId: string | undefined

      // Apply the optimistic change based on mutation type
      queryClient.setQueriesData<PagedCache<TData>>(
        { queryKey },
        (old) => {
          if (!old) return old

          // ── INSERT ─────────────────────────────────────────────────────
          if (type === 'insert' && toOptimistic) {
            optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const optimisticRecord = {
              ...toOptimistic(input),
              id: optimisticId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as TData
            return {
              data: [optimisticRecord, ...old.data],
              count: old.count + 1,
            }
          }

          // ── UPDATE ─────────────────────────────────────────────────────
          if (type === 'update' && toOptimistic) {
            const patch = toOptimistic(input)
            const targetId = (input as unknown as { id: string }).id
            return {
              data: old.data.map((item) =>
                item.id === targetId
                  ? { ...item, ...patch, updated_at: new Date().toISOString() }
                  : item
              ),
              count: old.count,
            }
          }

          // ── DELETE ─────────────────────────────────────────────────────
          if (type === 'delete') {
            const targetId = (input as unknown as { id: string }).id
            return {
              data: old.data.filter((item) => item.id !== targetId),
              count: Math.max(0, old.count - 1),
            }
          }

          return old
        }
      )

      return { snapshot, optimisticId }
    },

    // ── RULE 5: Swap optimistic UUID with real server UUID ────────────────
    onSuccess: (serverData, input, context) => {
      if (type === 'insert' && context?.optimisticId) {
        const tempId = context.optimisticId
        queryClient.setQueriesData<PagedCache<TData>>(
          { queryKey },
          (old) => {
            if (!old) return old
            return {
              ...old,
              data: old.data.map((item) =>
                item.id === tempId ? { ...item, ...serverData } : item
              ),
            }
          }
        )
      }

      if (messages?.success) toast.success(messages.success)
      onSuccess?.(serverData, input)

      // ── RULE 3: Debounced fallback invalidation ───────────────────────
      // Realtime WebSocket delivers the real row in 50-200ms.
      // We wait invalidateDelayMs before forcing a full refetch as insurance.
      if (invalidateDelayMs > 0) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey, exact: false })
        }, invalidateDelayMs)
      } else {
        queryClient.invalidateQueries({ queryKey, exact: false })
      }
    },

    // ── RULE 2: Rollback on error ─────────────────────────────────────────
    onError: (error, input, context) => {
      if (context?.snapshot) {
        // Restore every cache entry from the snapshot taken before mutation
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data)
        }
      }
      const msg = messages?.error ?? `Ошибка: ${error.message}`
      toast.error(msg)
      onError?.(error, input)
    },
  })
}
