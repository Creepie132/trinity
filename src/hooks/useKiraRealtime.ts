'use client'

import { useRef } from 'react'
import { useBranch } from '@/contexts/BranchContext'
import { useClients } from '@/hooks/useClients'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { KiraWaveState } from '@/components/kira/KiraWave'

// ── Хук: слушает Supabase Realtime и возвращает состояние KiraWave ─────────────
// Логика:
//   payments  → INSERT completed → 'payment'  (фиолетовый взрыв)
//   clients   → INSERT           → 'client'   (золотой)
//   visits    → INSERT           → 'visit'    (циан)
//   visits    → UPDATE cancelled → 'cancel'   (затухает)
//
// ⚠️ clients: подписка через useClients (onClientInsert callback),
// чтобы избежать дублирования канала с тем же (table, org_id, filter) —
// Supabase Realtime выдаёт "mismatch between server and client bindings"
// при двух каналах на одну комбинацию schema/table/filter.

interface KiraRealtimeOptions {
  onStateChange: (state: KiraWaveState) => void
}

export function useKiraRealtime({ onStateChange }: KiraRealtimeOptions) {
  const { activeOrgId } = useBranch()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Вспомогательная функция: ставим состояние на 4 сек, потом возвращаем idle
  const trigger = (state: KiraWaveState) => {
    onStateChange(state)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onStateChange('idle'), 4000)
  }

  // ── Клиенты: piggyback на единственную подписку useClients ──────────────
  // useClients вызывается без параметров (search/page/size) — только для RT.
  // Реальный список клиентов читается в clients/page.tsx отдельным вызовом.
  useClients(undefined, 1, 1, () => trigger('client'))

  // ── Платежи — новый завершённый платёж ──────────────────────────────────
  useRealtimeSync({
    table: 'payments',
    orgId: activeOrgId,
    queryKey: ['kira-payments'],
    events: ['INSERT'],
    onEvent: ({ new: row }) => {
      const status = (row as any)?.status
      if (status === 'completed' || status === 'success') {
        trigger('payment')
      }
    },
  })

  // ── Визиты — новый визит или отмена ─────────────────────────────────────
  useRealtimeSync({
    table: 'visits',
    orgId: activeOrgId,
    queryKey: ['kira-visits'],
    events: ['INSERT', 'UPDATE'],
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'INSERT') {
        trigger('visit')
      } else if (eventType === 'UPDATE' && (row as any)?.status === 'cancelled') {
        trigger('cancel')
      }
    },
  })
}
