'use client'

import { useRef } from 'react'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { KiraWaveState } from '@/components/kira/KiraWave'

// ── Хук: слушает Supabase Realtime и возвращает состояние KiraWave ─────────────
// Логика:
//   payments  → INSERT completed → 'payment'  (фиолетовый взрыв)
//   clients   → INSERT           → 'client'   (золотой)
//   visits    → INSERT           → 'visit'    (циан)
//   visits    → UPDATE cancelled → 'cancel'   (затухает)
//
// ⚠️ Использует useRealtimeSync (НЕ прямые supabase.channel()) чтобы избежать
// дублирования каналов на те же таблицы → "mismatch between server and client
// bindings" error. Логика Киры передаётся через onEvent callback.

interface KiraRealtimeOptions {
  onStateChange: (state: KiraWaveState) => void
}

export function useKiraRealtime({ onStateChange }: KiraRealtimeOptions) {
  const { activeOrgId, mainOrgId } = useBranch()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Вспомогательная функция: ставим состояние на 4 сек, потом возвращаем idle
  const trigger = (state: KiraWaveState) => {
    onStateChange(state)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onStateChange('idle'), 4000)
  }

  // ── Платежи — новый завершённый платёж ──────────────────────────────────
  useRealtimeSync({
    table: 'payments',
    orgId: activeOrgId,
    queryKey: ['kira-payments'],   // уникальный ключ — не конфликтует с usePayments
    events: ['INSERT'],
    onEvent: ({ new: row }) => {
      const status = (row as any)?.status
      if (status === 'completed' || status === 'success') {
        trigger('payment')
      }
    },
  })

  // ── Клиенты — новый клиент ───────────────────────────────────────────────
  // clients привязаны к mainOrgId (shared across branches)
  useRealtimeSync({
    table: 'clients',
    orgId: mainOrgId,
    queryKey: ['kira-clients'],    // уникальный ключ — не конфликтует с useClients
    events: ['INSERT'],
    onEvent: () => trigger('client'),
  })

  // ── Визиты — новый визит или отмена ─────────────────────────────────────
  useRealtimeSync({
    table: 'visits',
    orgId: activeOrgId,
    queryKey: ['kira-visits'],     // уникальный ключ — не конфликтует с visits/page.tsx
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
