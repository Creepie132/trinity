'use client'

/**
 * usePaymentMethodConfig
 *
 * Загружает enabled_payment_methods + статус терминала из /api/payments/settings.
 * Обогащает конфиг правилами бизнес-логики:
 *   - Нет терминала → card disabled (принудительно)
 *   - Есть терминал → bit disabled (принудительно, BIT идёт через Tranzila)
 *
 * Используется:
 *   - /settings/payments (тумблеры)
 *   - UnifiedPaymentDialog (фильтрация методов)
 *   - /payments methodBreakdown (нормализация)
 */

import { useQuery } from '@tanstack/react-query'
import type { CanonicalPaymentMethod } from '@/lib/payment-method-normalizer'
import { CANONICAL_METHOD_CFG } from '@/lib/payment-method-normalizer'

export const ALL_METHOD_KEYS: CanonicalPaymentMethod[] = [
  'cash', 'card', 'bit', 'bank_transfer', 'check',
]

export interface PaymentMethodState {
  key: CanonicalPaymentMethod
  enabled: boolean
  /** Принудительно выключен правилом бизнес-логики */
  forcedOff: boolean
  disabledReason?: { ru: string; he: string }
  label: { ru: string; he: string }
  icon: string
  color: string
  bg: string
  border: string
}

interface SettingsApiResponse {
  tranzila_terminal: string
  terminal_connected: boolean
  tranzila_password_set: boolean
  tranzila_token_terminal: string
  tranzila_token_password_set: boolean
  enabled_payment_methods: string[]
}

export function usePaymentMethodConfig() {
  const { data, isLoading, error, refetch } = useQuery<SettingsApiResponse>({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const res = await fetch('/api/payments/settings')
      if (!res.ok) throw new Error('Failed to load payment settings')
      return res.json()
    },
    staleTime: 60_000,
  })

  // terminal_connected приходит с сервера: !!(tranzila_terminal?.trim())
  const hasTerminal = data?.terminal_connected ?? false
  const rawEnabled: string[] = data?.enabled_payment_methods ?? ALL_METHOD_KEYS

  const methods: PaymentMethodState[] = ALL_METHOD_KEYS.map(key => {
    const cfg = CANONICAL_METHOD_CFG[key]
    let enabled = rawEnabled.includes(key)
    let forcedOff = false
    let disabledReason: { ru: string; he: string } | undefined

    if (key === 'card' && !hasTerminal) {
      forcedOff = true
      enabled = false
      disabledReason = {
        ru: 'Требуется терминал Tranzila — настройте в Админке',
        he: 'נדרש טרמינל Tranzila — הגדר בלוח הניהול',
      }
    }

    if (key === 'bit' && hasTerminal) {
      forcedOff = true
      enabled = false
      disabledReason = {
        ru: 'Bit обрабатывается через шлюз Tranzila автоматически',
        he: 'ביט מטופל אוטומטית דרך שער Tranzila',
      }
    }

    return {
      key,
      enabled,
      forcedOff,
      disabledReason,
      label: cfg.label,
      icon: cfg.icon,
      color: cfg.color,
      bg: cfg.bg,
      border: (cfg as any).border ?? `${cfg.color}40`,
    }
  })

  const enabledMethods = methods.filter(m => m.enabled && !m.forcedOff)

  return { methods, enabledMethods, hasTerminal, isLoading, error, refetch, rawEnabled }
}
