'use client'

import { useState, useTransition } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePaymentMethodConfig } from '@/hooks/usePaymentMethodConfig'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updatePaymentMethods } from '@/actions/payment-settings'
import { CreditCard, ArrowRight, ArrowLeft, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSettingsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const queryClient = useQueryClient()

  const { methods, rawEnabled, isLoading } = usePaymentMethodConfig()

  // Какой ключ прямо сейчас в процессе мутации — блокировка тумблера
  const [mutatingKey, setMutatingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleToggle(key: string) {
    // Защита от race condition — один запрос за раз
    if (mutatingKey) return

    const isCurrentlyOn = rawEnabled.includes(key)
    const methodConfig = methods.find((m) => m.key === key)
    if (!methodConfig || methodConfig.forcedOff) return

    // Вычисляем новый набор активных методов (без forcedOff)
    const nextEnabled = isCurrentlyOn
      ? rawEnabled.filter((k) => k !== key)
      : [...rawEnabled, key]

    const activeMethods = nextEnabled.filter((k) => {
      const m = methods.find((m) => m.key === k)
      return m && !m.forcedOff
    })

    if (activeMethods.length === 0) {
      toast.error(
        isHe
          ? 'יש לבחור לפחות שיטת תשלום אחת'
          : 'Выберите хотя бы один способ оплаты'
      )
      return
    }

    setMutatingKey(key)

    startTransition(async () => {
      try {
        const result = await updatePaymentMethods({
          enabled_payment_methods: activeMethods,
        })

        if (!result.success) {
          throw new Error('error' in result ? result.error : 'Ошибка')
        }

        // Инвалидируем React Query — следующий рендер читает из БД (SSoT)
        await queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
        await queryClient.invalidateQueries({ queryKey: ['payments'] })

        toast.success(isHe ? 'שמור ✓' : 'Сохранено ✓')
      } catch (e: any) {
        // Откат UI не нужен — мы не меняем локальный стейт.
        // rawEnabled не изменился → тумблер вернётся в исходное положение после рефетча.
        toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка сохранения'))
      } finally {
        setMutatingKey(null)
      }
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        {isHe ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isHe ? 'חזרה להגדרות' : 'Назад к настройкам'}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isHe ? 'הגדרות תשלום' : 'Настройки платежей'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHe ? 'שינויים נשמרים אוטומטית' : 'Изменения сохраняются автоматически'}
          </p>
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
                ? 'לחץ על שיטה כדי להפעיל או להשבית אותה'
                : 'Нажмите на способ — изменение сохранится мгновенно'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {methods.map((method) => {
              const locale = isHe ? 'he' : 'ru'
              const isOn = !method.forcedOff && rawEnabled.includes(method.key)
              const isDisabled = method.forcedOff
              const isMutating = mutatingKey === method.key

              return (
                <button
                  key={method.key}
                  type="button"
                  onClick={() =>
                    !isDisabled && !mutatingKey && handleToggle(method.key)
                  }
                  // Блокируем всю группу пока идёт любой запрос
                  disabled={isDisabled || !!mutatingKey}
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
                    <div
                      className="font-semibold text-sm"
                      style={{ color: isOn ? method.color : 'var(--foreground)' }}
                    >
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

                  {/* Тумблер / Спиннер */}
                  <div
                    className="flex-shrink-0"
                    style={{ width: 48, height: 24 }}
                  >
                    {isMutating ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2
                          size={18}
                          className="animate-spin"
                          style={{ color: method.color }}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-6 rounded-full transition-all relative"
                        style={{
                          background: isOn ? method.color : 'var(--muted)',
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                          style={{ left: isOn ? 'calc(100% - 22px)' : '2px' }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
