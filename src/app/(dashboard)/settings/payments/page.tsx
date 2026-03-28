'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { usePaymentMethodConfig, ALL_METHOD_KEYS } from '@/hooks/usePaymentMethodConfig'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CreditCard, ArrowRight, ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  const { methods, rawEnabled, isLoading } = usePaymentMethodConfig()

  // Локальное состояние тумблеров (синхронизируется с методами)
  const [localEnabled, setLocalEnabled] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Синхронизируем localEnabled при загрузке данных
  useEffect(() => {
    if (!isLoading && rawEnabled.length > 0) {
      setLocalEnabled(rawEnabled)
    }
  }, [isLoading, rawEnabled])

  function toggleMethod(key: string) {
    setLocalEnabled(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleSave() {
    if (!orgId) return
    // Всегда минимум один метод
    const toSave = localEnabled.filter(k => {
      const m = methods.find(m => m.key === k)
      return m && !m.forcedOff
    })
    if (toSave.length === 0) {
      toast.error(isHe ? 'יש לבחור לפחות שיטת תשלום אחת' : 'Выберите хотя бы один способ оплаты')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/payments/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_payment_methods: toSave }),
      })
      if (!res.ok) throw new Error('Failed to save')
      // Инвалидируем кеш — все компоненты обновятся реактивно
      await queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      toast.success(isHe ? 'שיטות התשלום נשמרו ✓' : 'Способы оплаты сохранены ✓')
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back */}
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header — без подзаголовка про Tranzila */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isHe ? 'הגדרות תשלום' : 'Настройки платежей'}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          {isHe ? 'טוען...' : 'Загрузка...'}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {isHe ? 'שיטות תשלום' : 'Способы оплаты'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isHe
                ? 'בחר אילו שיטות תשלום יוצגו בעת קבלת תשלום'
                : 'Выберите, какие способы оплаты доступны при создании платежей'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {methods.map(method => {
              const locale = isHe ? 'he' : 'ru'
              const isOn = !method.forcedOff && localEnabled.includes(method.key)
              const isDisabled = method.forcedOff
              return (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => !isDisabled && toggleMethod(method.key)}
                  disabled={isDisabled}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed"
                  style={{
                    borderColor: isOn ? method.border : 'var(--border)',
                    background: isOn ? method.bg : 'var(--card)',
                    opacity: isDisabled ? 0.55 : 1,
                  }}
                >
                  {/* Иконка метода */}
                  <div
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: isOn ? `${method.color}20` : 'var(--muted)',
                      color: isOn ? method.color : 'var(--muted-foreground)',
                    }}
                  >
                    {method.icon}
                  </div>

                  {/* Текст */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: isOn ? method.color : 'var(--foreground)' }}>
                      {method.label[locale]}
                    </div>
                    {isDisabled && method.disabledReason && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Info size={11} className="text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {method.disabledReason[locale]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Тумблер */}
                  <div
                    className="flex-shrink-0 w-12 h-6 rounded-full transition-all relative"
                    style={{
                      background: isOn ? method.color : 'var(--muted)',
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                      style={{ left: isOn ? 'calc(100% - 22px)' : '2px' }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-medium text-sm text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
          >
            {saving
              ? (isHe ? 'שומר...' : 'Сохранение...')
              : (isHe ? 'שמור שיטות תשלום' : 'Сохранить способы оплаты')}
          </button>
        </div>
      )}
    </div>
  )
}
