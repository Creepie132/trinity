'use client'

/**
 * InstallmentForm — форма рассрочки внутри UnifiedPaymentDialog.
 *
 * Показывает:
 *   - Выбор кол-ва платежей (2–12 быстрые кнопки + инпут)
 *   - Выбор периодичности (weekly / biweekly / monthly)
 *   - Превью: ₪500 × 5 платежей = ₪2,500, первый сегодня
 *   - Состояние токена карты: есть / нет (нужна привязка)
 *   - Кнопка "Списать первый платёж" → создать план
 */

import { useState, useEffect } from 'react'
import { CreditCard, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface InstallmentConfig {
  count:      number
  frequency:  InstallmentFrequency
  perPayment: number
}

export interface ClientCardToken {
  tranzila_token:   string
  tranzila_expdate: string
  card_last4?:      string
}

interface InstallmentFormProps {
  totalAmount:  number
  clientToken:  ClientCardToken | null
  disabled?:    boolean
  locale:       'he' | 'ru'
  onChange:     (config: InstallmentConfig | null) => void
}

const QUICK_COUNTS = [2, 3, 4, 5, 6, 10, 12]

const I18N = {
  he: {
    title:       'תשלומים',
    numPayments: 'מספר תשלומים',
    frequency:   'תדירות',
    weekly:      'שבועי',
    biweekly:    'כל שבועיים',
    monthly:     'חודשי',
    perPayment:  'לתשלום',
    firstToday:  'הראשון היום',
    noToken:     'ללקוח אין כרטיס שמור. יש לשמור כרטיס בכרטיס הלקוח תחילה.',
    preview:     'סה״כ',
    payments:    'תשלומים',
  },
  ru: {
    title:       'Рассрочка',
    numPayments: 'Количество платежей',
    frequency:   'Периодичность',
    weekly:      'Еженедельно',
    biweekly:    'Раз в 2 недели',
    monthly:     'Ежемесячно',
    perPayment:  'За платёж',
    firstToday:  'Первый сегодня',
    noToken:     'У клиента нет сохранённой карты. Сначала привяжите карту в карточке клиента.',
    preview:     'Итого',
    payments:    'платежей',
  },
} as const

export function InstallmentForm({
  totalAmount, clientToken, disabled = false, locale, onChange,
}: InstallmentFormProps) {
  const t = I18N[locale]
  const [count, setCount]         = useState(3)
  const [customCount, setCustom]  = useState('')
  const [freq, setFreq]           = useState<InstallmentFrequency>('monthly')

  const effectiveCount = customCount ? parseInt(customCount) : count
  const isValidCount   = !isNaN(effectiveCount) && effectiveCount >= 2 && effectiveCount <= 36
  const perPayment     = isValidCount && totalAmount > 0
    ? Math.round((totalAmount / effectiveCount) * 100) / 100
    : 0

  // Сообщаем родителю при каждом изменении
  useEffect(() => {
    if (!clientToken || !isValidCount || perPayment <= 0) {
      onChange(null)
    } else {
      onChange({ count: effectiveCount, frequency: freq, perPayment })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCount, freq, clientToken, totalAmount])

  const accent = '#8b5cf6'
  const accentBg = 'linear-gradient(135deg,#faf5ff,#ede9fe)'
  const accentBorder = '#ddd6fe'
  const accentColor = '#6d28d9'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Нет токена — предупреждение */}
      {!clientToken && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 12,
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#dc2626', margin: 0, lineHeight: 1.5 }}>{t.noToken}</p>
        </div>
      )}

      {/* Токен есть — показываем бейдж */}
      {clientToken && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', background: '#f0fdf4',
          border: '1px solid #bbf7d0', borderRadius: 10,
        }}>
          <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
          <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
            {locale === 'he' ? 'כרטיס שמור' : 'Карта сохранена'}
            {clientToken.card_last4 ? ` ••••${clientToken.card_last4}` : ''}
          </span>
        </div>
      )}

      {/* Количество платежей */}
      <div style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, padding: '14px 16px' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
          {t.numPayments}
        </label>

        {/* Быстрые кнопки */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {QUICK_COUNTS.map(n => {
            const active = !customCount && count === n
            return (
              <button
                key={n}
                disabled={disabled || !clientToken}
                onClick={() => { setCount(n); setCustom('') }}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: disabled || !clientToken ? 'not-allowed' : 'pointer',
                  background: active ? accent : 'rgba(139,92,246,0.1)',
                  color: active ? '#fff' : accentColor,
                  fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                {n}
              </button>
            )
          })}

          {/* Свой номер */}
          <Input
            type="number" min="2" max="36"
            value={customCount}
            placeholder="..."
            disabled={disabled || !clientToken}
            onChange={e => { setCustom(e.target.value); }}
            style={{
              width: 60, height: 34, fontSize: 14, fontWeight: 700,
              border: customCount ? `2px solid ${accent}` : '1px solid #ddd6fe',
              borderRadius: 8, textAlign: 'center', padding: '0 8px',
            }}
          />
        </div>
      </div>

      {/* Периодичность */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
          {t.frequency}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['weekly', 'biweekly', 'monthly'] as InstallmentFrequency[]).map(f => (
            <button
              key={f}
              disabled={disabled || !clientToken}
              onClick={() => setFreq(f)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none',
                cursor: disabled || !clientToken ? 'not-allowed' : 'pointer',
                background: freq === f ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : '#f1f5f9',
                color: freq === f ? '#fff' : '#64748b',
                fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              {t[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Превью */}
      {isValidCount && perPayment > 0 && (
        <div style={{
          padding: '14px 16px', background: 'linear-gradient(135deg,#faf5ff,#ede9fe)',
          border: '1.5px solid #c4b5fd', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} style={{ color: accentColor }} />
            <div>
              <span style={{ fontSize: 20, fontWeight: 900, color: accentColor }}>
                ₪{perPayment.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: '#7c3aed', marginInlineStart: 6 }}>
                × {effectiveCount} {t.payments}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>{t.preview}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>
              ₪{(perPayment * effectiveCount).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{t.firstToday}</div>
          </div>
        </div>
      )}
    </div>
  )
}
