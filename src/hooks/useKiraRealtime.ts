'use client'

import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useBranch } from '@/contexts/BranchContext'
import type { KiraWaveState } from '@/components/kira/KiraWave'

// ── Хук: слушает Supabase Realtime и возвращает состояние KiraWave ─────────────
// Логика:
//   payments  → INSERT completed → 'payment'  (фиолетовый взрыв)
//   clients   → INSERT           → 'client'   (золотой)
//   visits    → INSERT           → 'visit'    (циан)
//   visits    → UPDATE cancelled → 'cancel'   (затухает)

interface KiraRealtimeOptions {
  onStateChange: (state: KiraWaveState) => void
}

export function useKiraRealtime({ onStateChange }: KiraRealtimeOptions) {
  const { activeOrgId } = useBranch()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!activeOrgId) return

    const supabase = createSupabaseBrowserClient()

    // Вспомогательная функция: ставим состояние на 4 сек, потом возвращаем idle
    const trigger = (state: KiraWaveState) => {
      onStateChange(state)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onStateChange('idle'), 4000)
    }

    // ── Платежи — новый завершённый платёж ──────────────────────────────────
    const paymentsChannel = supabase
      .channel(`kira-payments-${activeOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `org_id=eq.${activeOrgId}`,
        },
        (payload) => {
          const status = payload.new?.status
          if (status === 'completed' || status === 'success') {
            trigger('payment')
          }
        }
      )
      .subscribe()

    // ── Клиенты — новый клиент ───────────────────────────────────────────────
    const clientsChannel = supabase
      .channel(`kira-clients-${activeOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clients',
          filter: `org_id=eq.${activeOrgId}`,
        },
        () => trigger('client')
      )
      .subscribe()

    // ── Визиты — новый визит или отмена ─────────────────────────────────────
    const visitsChannel = supabase
      .channel(`kira-visits-${activeOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visits',
          filter: `org_id=eq.${activeOrgId}`,
        },
        () => trigger('visit')
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'visits',
          filter: `org_id=eq.${activeOrgId}`,
        },
        (payload) => {
          if (payload.new?.status === 'cancelled') {
            trigger('cancel')
          }
        }
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(clientsChannel)
      supabase.removeChannel(visitsChannel)
    }
  }, [activeOrgId, onStateChange])
}
