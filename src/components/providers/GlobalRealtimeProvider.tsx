'use client'

/**
 * GlobalRealtimeProvider — Trinity CRM central Realtime cache surgeon.
 *
 * Mounts ONCE in DashboardShell (inside ClientProviders).
 * Opens ONE channel per table per org — zero duplicates.
 *
 * Unlike useRealtimeSync (which calls invalidateQueries → full refetch),
 * this provider does SURGICAL cache mutations via setQueriesData:
 *   INSERT  → prepend row to all matching cache pages
 *   UPDATE  → patch the row in-place across all matching cache pages
 *   DELETE  → remove the row from all matching cache pages
 *
 * Only falls back to invalidateQueries for tables whose cache shape
 * is unknown (e.g. non-paged, derived, or aggregate data).
 *
 * Architecture rules enforced:
 *   Rule 1: Global only — no local subscriptions allowed in data hooks.
 *   Rule 4: filter `org_id=eq.${orgId}` on every channel (network-level).
 *   Rule 5: INSERT payload replaces optimistic UUID if present in cache.
 *
 * ─── Adding a new table ─────────────────────────────────────────────────────
 * 1. Add a TABLE_CONFIG entry (table name → query key + optional extras).
 * 2. If the table has non-standard cache shape, add a custom handler.
 * 3. No other changes needed — the single channel handles all events.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown> & { id?: string }

type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/** Paged cache shape (used in clients, visits, sales, payments, etc.) */
interface PagedCache {
  data: AnyRecord[]
  count: number
}

/** Flat array cache shape (used in products, services, etc.) */
type FlatCache = AnyRecord[]

/** Union of cache shapes we handle surgically */
type KnownCache = PagedCache | FlatCache

function isPagedCache(cache: unknown): cache is PagedCache {
  return (
    typeof cache === 'object' &&
    cache !== null &&
    'data' in cache &&
    Array.isArray((cache as PagedCache).data)
  )
}

// ── Table configuration ───────────────────────────────────────────────────────

interface TableConfig {
  /** TanStack Query key prefix for this table */
  queryKey: QueryKey
  /**
   * Org context: 'active' = branch-scoped (visits, sales, payments, products, expenses)
   *               'main'   = shared across branches (clients, services)
   * Default: 'active'
   */
  orgScope?: 'active' | 'main'
  /**
   * If true, skip surgical setQueriesData and just invalidate.
   * Use for aggregate/computed caches (stats, charts, reports).
   */
  invalidateOnly?: boolean
  /**
   * Additional queryKeys to invalidate when this table changes.
   * Used for derived/computed caches that depend on this table.
   */
  alsoInvalidate?: QueryKey[]
  /**
   * Custom side-effect to run for specific events.
   * Fires BEFORE cache surgery.
   */
  onEvent?: (event: RealtimeEventType, row: AnyRecord) => void
}

// Centralised table → cache mapping
// To add a table: one entry here, nothing else.
const TABLE_CONFIGS: Record<string, TableConfig> = {
  clients: {
    queryKey: ['clients'],
    orgScope: 'main',
    onEvent: (event) => {
      if (event === 'INSERT') dispatchGlobal('trinity:new-client')
    },
  },
  visits: {
    queryKey: ['visits'],
    alsoInvalidate: [['dashboard']],
    onEvent: (event, row) => {
      if (event === 'INSERT') dispatchGlobal('trinity:new-visit')
      if (event === 'UPDATE' && row.status === 'cancelled') dispatchGlobal('trinity:cancel-visit')
    },
  },
  sales: {
    queryKey: ['sales'],
    alsoInvalidate: [['payments-stats'], ['sales-chart']],
  },
  payments: {
    queryKey: ['payments'],
    alsoInvalidate: [['payments-stats']],
    onEvent: (event, row) => {
      if (event === 'INSERT') {
        const s = row.status
        if (s === 'completed' || s === 'success') dispatchGlobal('trinity:new-payment')
      }
    },
  },
  expenses: {
    queryKey: ['expenses'],
    alsoInvalidate: [['expenses-stats']],
  },
  products: {
    queryKey: ['products'],
  },
  services: {
    queryKey: ['services'],
    orgScope: 'main',
  },
  visit_services: {
    queryKey: ['visit-services'],
  },
  inventory_transactions: {
    queryKey: ['inventory-transactions'],
  },
  tasks: {
    queryKey: ['tasks-diary'],
    alsoInvalidate: [['tasks']],
  },
}

// ── Window dispatch helper ────────────────────────────────────────────────────

function dispatchGlobal(event: string, detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event, detail ? { detail } : undefined))
  }
}

// ── Surgical cache merge ──────────────────────────────────────────────────────

/**
 * Applies a Realtime payload to a single cache entry without triggering
 * a network refetch. Handles both paged ({data, count}) and flat ([]) shapes.
 *
 * Rule 5 (INSERT): if an optimistic record (id starts with 'optimistic-')
 * exists in cache with matching fields, it is replaced by the real server row.
 * Otherwise the real row is prepended.
 */
function applySurgery(
  cache: KnownCache,
  event: RealtimeEventType,
  newRow: AnyRecord,
  oldRow: Partial<AnyRecord>
): KnownCache {
  if (isPagedCache(cache)) {
    return applyToArray(cache.data, cache.count, event, newRow, oldRow, true) as PagedCache
  }
  if (Array.isArray(cache)) {
    return applyToArray(cache, cache.length, event, newRow, oldRow, false) as FlatCache
  }
  return cache
}

function applyToArray(
  items: AnyRecord[],
  count: number,
  event: RealtimeEventType,
  newRow: AnyRecord,
  oldRow: Partial<AnyRecord>,
  paged: boolean
): PagedCache | FlatCache {
  let nextItems: AnyRecord[]
  let nextCount = count

  if (event === 'INSERT') {
    const realId = newRow.id as string | undefined
    // Rule 5: find optimistic placeholder and replace it
    const optimisticIdx = realId
      ? items.findIndex(
          (item) =>
            typeof item.id === 'string' &&
            item.id.startsWith('optimistic-')
        )
      : -1

    if (optimisticIdx !== -1) {
      // Swap optimistic row with real server row (preserves position)
      nextItems = items.map((item, i) => (i === optimisticIdx ? { ...item, ...newRow } : item))
      // count doesn't change — it was already bumped during optimistic insert
    } else {
      nextItems = [newRow, ...items]
      nextCount = count + 1
    }
  } else if (event === 'UPDATE') {
    nextItems = items.map((item) =>
      item.id === newRow.id ? { ...item, ...newRow } : item
    )
  } else {
    // DELETE — use old row id (new is empty object on DELETE)
    const deletedId = oldRow.id ?? newRow.id
    nextItems = items.filter((item) => item.id !== deletedId)
    nextCount = Math.max(0, count - 1)
  }

  if (paged) return { data: nextItems, count: nextCount }
  return nextItems
}

// ── Channel manager ───────────────────────────────────────────────────────────

/**
 * Opens a single Supabase Realtime channel per (table, orgId).
 * Returns a cleanup function that removes the channel.
 *
 * Rule 4: filter `org_id=eq.${orgId}` — Supabase pre-filters at DB level.
 */
function openChannel(
  table: string,
  orgId: string,
  onPayload: (payload: RealtimePostgresChangesPayload<AnyRecord>) => void
): () => void {
  const channelName = `grt:${table}:${orgId}`

  // Guard against duplicate channels (React StrictMode double-mount)
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`)
  if (existing) {
    return () => { supabase.removeChannel(existing) }
  }

  const channel = supabase
    .channel(channelName)
    .on<AnyRecord>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `org_id=eq.${orgId}`, // Rule 4: network-level isolation
      },
      onPayload
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[GlobalRealtimeProvider] Channel error table="${table}" org="${orgId}":`, err)
      }
    })

  return () => { supabase.removeChannel(channel) }
}

// ── Provider component ────────────────────────────────────────────────────────

interface GlobalRealtimeProviderProps {
  /** Active (branch-scoped) org ID */
  activeOrgId: string | null
  /** Main org ID (shared: clients, services) */
  mainOrgId: string | null
}

export function GlobalRealtimeProvider({ activeOrgId, mainOrgId }: GlobalRealtimeProviderProps) {
  const queryClient = useQueryClient()
  // Map of channelName → cleanup fn, to avoid re-subscribing on every render
  const channelsRef = useRef<Map<string, () => void>>(new Map())

  const handlePayload = useCallback(
    (
      config: TableConfig,
      payload: RealtimePostgresChangesPayload<AnyRecord>
    ) => {
      const event = payload.eventType as RealtimeEventType
      const newRow = (payload.new ?? {}) as AnyRecord
      const oldRow = (payload.old ?? {}) as Partial<AnyRecord>

      // Side-effect first (toasts, CustomEvents)
      config.onEvent?.(event, newRow)

      if (config.invalidateOnly) {
        queryClient.invalidateQueries({ queryKey: config.queryKey, exact: false })
      } else {
        // Surgical update — no network request
        queryClient.setQueriesData<KnownCache>(
          { queryKey: config.queryKey },
          (cache) => {
            if (cache === undefined || cache === null) return cache
            return applySurgery(cache as KnownCache, event, newRow, oldRow) as KnownCache
          }
        )
      }

      // Invalidate derived caches (stats, charts)
      config.alsoInvalidate?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      })
    },
    [queryClient]
  )

  useEffect(() => {
    const cleanups: (() => void)[] = []

    for (const [table, config] of Object.entries(TABLE_CONFIGS)) {
      const scopedOrgId =
        config.orgScope === 'main' ? mainOrgId : activeOrgId

      if (!scopedOrgId) continue

      const channelKey = `${table}:${scopedOrgId}`
      if (channelsRef.current.has(channelKey)) continue // already open

      const cleanup = openChannel(table, scopedOrgId, (payload) =>
        handlePayload(config, payload)
      )

      channelsRef.current.set(channelKey, cleanup)
      cleanups.push(cleanup)
    }

    return () => {
      // Only remove channels opened in THIS effect invocation
      cleanups.forEach((fn) => fn())
      // Remove their keys so they can be re-created on next mount
      for (const [table, config] of Object.entries(TABLE_CONFIGS)) {
        const scopedOrgId = config.orgScope === 'main' ? mainOrgId : activeOrgId
        if (!scopedOrgId) continue
        channelsRef.current.delete(`${table}:${scopedOrgId}`)
      }
    }
  }, [activeOrgId, mainOrgId, handlePayload])

  return null
}

// ── Convenience re-export for ClientProviders.tsx ────────────────────────────
export { TABLE_CONFIGS, dispatchGlobal }
