'use client'

import { useEffect, useRef } from 'react'
import type { KiraWaveState } from '@/components/kira/KiraWave'

// NOTE: useRealtimeSync removed from here — centralised in GlobalRealtimeSync.
// Kira receives events via CustomEvents dispatched from GlobalRealtimeSync:
//   trinity:new-client    → client INSERT
//   trinity:new-payment   → payment INSERT (completed)
//   trinity:new-visit     → visit INSERT
//   trinity:cancel-visit  → visit UPDATE (status=cancelled)

interface KiraRealtimeOptions {
  onStateChange: (state: KiraWaveState) => void
}

export function useKiraRealtime({ onStateChange }: KiraRealtimeOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const trigger = (state: KiraWaveState) => {
    onStateChange(state)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onStateChange('idle'), 4000)
  }

  useEffect(() => {
    const onClient  = () => trigger('client')
    const onPayment = () => trigger('payment')
    const onVisit   = () => trigger('visit')
    const onCancel  = () => trigger('cancel')

    window.addEventListener('trinity:new-client',   onClient)
    window.addEventListener('trinity:new-payment',  onPayment)
    window.addEventListener('trinity:new-visit',    onVisit)
    window.addEventListener('trinity:cancel-visit', onCancel)

    return () => {
      window.removeEventListener('trinity:new-client',   onClient)
      window.removeEventListener('trinity:new-payment',  onPayment)
      window.removeEventListener('trinity:new-visit',    onVisit)
      window.removeEventListener('trinity:cancel-visit', onCancel)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}
