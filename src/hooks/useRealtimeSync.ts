'use client'

/**
 * useRealtimeSync — Universal Supabase Realtime hook for Trinity CRM
 *
 * Subscribes to postgres_changes on any table filtered by org_id,
 * then invalidates the TanStack Query cache on INSERT / UPDATE / DELETE.
 *
 * ─── Security model ───────────────────────────────────────────────────────
 * Layer 1: filter `org_id=eq.${orgId}` in the Realtime subscription
 *   → Supabase only delivers WebSocket messages for THIS org (performance)
 * Layer 2: RLS on the table
 *   → Even if the filter is bypassed, RLS prevents cross-org data leakage
 * Layer 3: Browser client uses user JWT (not service role)
 *   → Realtime connection inherits the same permissions as regular queries
 *
 * ─── Cache invalidation strategy ─────────────────────────────────────────
 * Uses `exact: false` — so queryKey ['visits'] invalidates ALL queries
 * that start with that prefix: ['visits', orgId, 'today', ...], etc.
 * A 300ms debounce batches rapid-fire events (e.g. bulk import of visits)
 * into a single re-fetch.
 *
 * ─── Future Redis cache note ──────────────────────────────────────────────
 * This hook invalidates the request-scoped React Query cache only.
 * If a long-lived Redis cache is ever added for getActiveOrgId or org data,
 * it must be invalidated separately on ban/role-change events (TTL ≤ 60s).
 *
 * ─── Add any table in ~1 minute ───────────────────────────────────────────
 * ```ts
 * useRealtimeSync({ table: 'payments', orgId: activeOrgId, queryKey: ['payments'] })
 * useRealtimeSync({ table: 'clients',  orgId: mainOrgId,   queryKey: ['clients']  })
 * useRealtimeSync({ table: 'products', orgId: activeOrgId, queryKey: ['products'] })
 * ```
 */

import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEvent
  /** Full new row (INSERT / UPDATE). Empty object for DELETE. */
  new: T
  /** Old row values (UPDATE / DELETE). Requires REPLICA IDENTITY FULL on the table
   *  for UPDATE; DELETE always returns at least the primary key. */
  old: Partial<T>
}

export interface UseRealtimeSyncOptions<T = Record<string, unknown>> {
  /** Supabase table to subscribe to */
  table: string

  /** Active org_id — security boundary AND Realtime filter.
   *  Subscription is paused when null (user not yet authenticated). */
  orgId: string | null

  /**
   * TanStack Query key prefix to invalidate when any event arrives.
   * Example: ['visits'] will also invalidate ['visits', orgId, 'today', ...]
   */
  queryKey: QueryKey

  /** Which events to subscribe to. Defaults to all three. */
  events?: RealtimeEvent[]

  /**
   * Disable the subscription entirely.
   * Useful during tab switch, unauthenticated state, or feature-flag off.
   * Default: true (enabled).
   */
  enabled?: boolean

  /**
   * Debounce window in ms.
   * Batches rapid events (e.g. 10 visits imported at once) into ONE re-fetch.
   * Default: 300ms — enough to absorb bursts, fast enough for real-time feel.
   */
  debounceMs?: number

  /**
   * Optional callback fired on EVERY event, BEFORE cache invalidation.
   * Use for: toast notifications, optimistic UI hints, analytics.
   *
   * ⚠️ IMPORTANT: Never use `payload.new` to directly update security-sensitive
   * cache (org_id, permissions). Let the TanStack Query re-fetch from your
   * API route be the source of truth — that goes through RLS + auth checks.
   */
  onEvent?: (payload: RealtimePayload<T>) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeSync<T = Record<string, unknown>>({
  table,
  orgId,
  queryKey,
  events = ['INSERT', 'UPDATE', 'DELETE'],
  enabled = true,
  debounceMs = 300,
  onEvent,
}: UseRealtimeSyncOptions<T>): void {
  const queryClient = useQueryClient()

  // Always use the latest callback without triggering re-subscription
  const onEventRef = useRef(onEvent)
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  // Stable queryKey ref — avoids re-subscription when parent re-renders
  // with an inline array literal (e.g. queryKey={['visits']})
  const queryKeyRef = useRef(queryKey)
  useEffect(() => { queryKeyRef.current = queryKey }, [queryKey])

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Stable string representation of queryKey — used both in channel name and deps
  const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)

  useEffect(() => {
    if (!enabled || !orgId) return

    // ── Channel setup ──────────────────────────────────────────────────────
    // Unique per (table, org, queryKey) — prevents collisions when multiple
    // hooks subscribe to the same table with different queryKeys
    const channelName = `realtime:${table}:${orgId}:${keyStr}`

    // Build the channel and register all requested events
    let channel = supabase.channel(channelName)

    for (const event of events) {
      channel = channel.on(
        // @ts-expect-error — Supabase TS overloads are slightly off for this signature
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          // org_id filter: Realtime pre-filters at DB level — only this org's rows
          // are delivered over the WebSocket. RLS is the real enforcement.
          filter: `org_id=eq.${orgId}`,
        },
        (payload: { new: T; old: Partial<T> }) => {
          // 1. Fire custom callback (toasts, optimistic hints)
          onEventRef.current?.({
            eventType: event,
            new: payload.new ?? ({} as T),
            old: payload.old ?? {},
          })

          // 2. Debounced cache invalidation — batches bursts into one re-fetch
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            // exact: false → invalidates ['visits'] AND ['visits', orgId, 'today', ...]
            queryClient.invalidateQueries({
              queryKey: queryKeyRef.current,
              exact: false,
            })
          }, debounceMs)
        }
      )
    }

    // ── Subscribe with error logging ──────────────────────────────────────
    channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        // Log for Vercel monitoring — not an exception, Supabase will retry
        console.error(`[useRealtimeSync] Channel error on table="${table}" org="${orgId}":`, err)
      }
      // status === 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' are expected lifecycle states
    })

    // ── Cleanup on unmount or dependency change ────────────────────────────
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }

    // events.join is intentional — array identity changes on every render,
    // string comparison is the correct way to detect actual event set changes
    // keyStr included so channel is recreated if queryKey changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orgId, enabled, debounceMs, queryClient, events.join(','), keyStr])
}
