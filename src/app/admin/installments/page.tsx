'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  RefreshCw, Clock, CreditCard, Hash,
  CircleDot, Info,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface PendingCharge {
  id: string
  installment_plan_id: string
  org_id: string
  client_id: string | null
  amount: number
  installment_number: number
  status: 'pending'
  error_message: string | null
  charged_at: string | null
  created_at: string
  payment_installments: {
    id: string
    installments_paid: number
    installments_count: number
    frequency: string
    next_due_date: string | null
    tranzila_token: string
    tranzila_expdate: string
  } | null
  organizations: {
    id: string
    name: string
    display_name: string | null
  } | null
}

type ActionType = 'mark_success' | 'mark_failed' | 'reset'

function maskToken(token: string) {
  if (!token || token.length < 6) return token
  return token.slice(0, 4) + '••••' + token.slice(-4)
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl', className)} />
}

function EmptyState({ lang }: { lang: 'he' | 'ru' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">
          {lang === 'ru' ? 'Зависших транзакций нет' : 'אין תשלומים תקועים'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {lang === 'ru'
            ? 'Все рассрочки обрабатываются нормально'
            : 'כל התשלומים בסדר תקין'}
        </p>
      </div>
    </div>
  )
}

const COLOR_MAP = {
  emerald: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
  red:     'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30',
  indigo:  'border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30',
}

function ActionBtn({ icon, label, title, color, disabled, loading, onClick }: {
  icon: React.ReactNode; label: string; title: string
  color: keyof typeof COLOR_MAP; disabled: boolean; loading: boolean; onClick: () => void
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap',
        COLOR_MAP[color],
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}

function MobileActionBtn({ icon, label, color, disabled, loading, onClick }: {
  icon: React.ReactNode; label: string
  color: keyof typeof COLOR_MAP; disabled: boolean; loading: boolean; onClick: () => void
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors',
        COLOR_MAP[color],
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}

export default function PendingInstallmentsPage() {
  const { language } = useLanguage()
  const lang = language as 'he' | 'ru'

  const [charges, setCharges] = useState<PendingCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [doing, setDoing] = useState<Record<string, ActionType | null>>({})
  const [confirmState, setConfirmState] = useState<{ id: string; action: ActionType } | null>(null)

  const S = lang === 'ru' ? {
    title: 'Зависшие рассрочки',
    subtitle: 'Транзакции pending старше 30 минут — крон их пропускает. Проверьте в Tranzila и разберите вручную.',
    refresh: 'Обновить',
    col_date: 'Создана', col_org: 'Организация', col_plan: 'Платёж',
    col_amount: 'Сумма', col_token: 'Токен', col_actions: 'Действие',
    mark_success: 'Успех', mark_failed: 'Отклонить', reset: 'Retry',
    tip_success: 'Деньги списаны в Tranzila — зафиксировать как успешный платёж',
    tip_failed: 'Tranzila отказала — пометить как неудачный (план → failed)',
    tip_reset: 'Удалить pending — крон повторит попытку завтра',
    confirm_success: 'Подтвердить: деньги действительно списаны в Tranzila?',
    confirm_failed: 'Пометить как failed? Это остановит план рассрочки.',
    confirm_reset: 'Удалить pending-запись? Крон попробует снова завтра.',
    confirm_yes: 'Да, выполнить', confirm_cancel: 'Отмена',
    done_success: 'Платёж засчитан как успешный',
    done_failed: 'Платёж помечен как неудачный',
    done_reset: 'Запись удалена — крон повторит завтра',
    err: 'Ошибка', of: 'из',
    freq: { weekly: 'еженедельно', biweekly: 'раз в 2 нед', monthly: 'ежемесячно' } as Record<string, string>,
    hint: 'Pending появляется когда Vercel упал между запросом в Tranzila и записью результата. Уточните в Tranzila — прошёл ли платёж — и нажмите нужную кнопку.',
    count_label: 'зависших транзакций',
  } : {
    title: 'תשלומים תקועים',
    subtitle: 'רשומות pending מעל 30 דקות — הקרון מדלג עליהן. בדקו בטרנזילה וטפלו ידנית.',
    refresh: 'רענן',
    col_date: 'נוצר', col_org: 'ארגון', col_plan: 'תשלום',
    col_amount: 'סכום', col_token: 'טוקן', col_actions: 'פעולה',
    mark_success: 'הצלחה', mark_failed: 'כישלון', reset: 'נסה שוב',
    tip_success: 'הכסף נגבה בטרנזילה — לרשום כתשלום מוצלח',
    tip_failed: 'טרנזילה דחתה — לסמן כנכשל (תוכנית → failed)',
    tip_reset: 'מחק pending — הקרון ינסה שוב מחר',
    confirm_success: 'לאשר: הכסף אכן נגבה בטרנזילה?',
    confirm_failed: 'לסמן כנכשל? זה יעצור את תוכנית הרכישה.',
    confirm_reset: 'למחוק את הרשומה? הקרון ינסה שוב מחר.',
    confirm_yes: 'כן, בצע', confirm_cancel: 'ביטול',
    done_success: 'התשלום נרשם כמוצלח',
    done_failed: 'התשלום נרשם ככישלון',
    done_reset: 'הרשומה נמחקה — הקרון ינסה שוב מחר',
    err: 'שגיאה', of: 'מתוך',
    freq: { weekly: 'שבועי', biweekly: 'כל שבועיים', monthly: 'חודשי' } as Record<string, string>,
    hint: 'Pending נוצר כשVercel קרס בין בקשה לטרנזילה לרישום תוצאה. בדקו בטרנזילה האם הכסף נגבה ולאחר מכן לחצו על הכפתור המתאים.',
    count_label: 'תשלומים תקועים',
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/installments/pending', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCharges(data.charges || [])
    } catch (e: any) {
      toast.error(S.err + ': ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (chargeId: string, action: ActionType) => {
    setConfirmState(null)
    setDoing(prev => ({ ...prev, [chargeId]: action }))
    try {
      const res = await fetch('/api/admin/installments/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charge_id: chargeId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      toast.success(
        action === 'mark_success' ? S.done_success
          : action === 'mark_failed' ? S.done_failed
          : S.done_reset
      )
      setCharges(prev => prev.filter(c => c.id !== chargeId))
    } catch (e: any) {
      toast.error(S.err + ': ' + e.message)
    } finally {
      setDoing(prev => ({ ...prev, [chargeId]: null }))
    }
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{S.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl">{S.subtitle}</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {S.refresh}
        </button>
      </div>

      {/* Counter */}
      {!loading && charges.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <CircleDot className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {charges.length} {S.count_label}
          </span>
        </div>
      )}

      {/* Hint */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{S.hint}</p>
      </div>

      {/* Confirm modal */}
      {confirmState && (() => {
        const { id, action } = confirmState
        const charge = charges.find(c => c.id === id)
        if (!charge) return null
        const confirmText = action === 'mark_success' ? S.confirm_success
          : action === 'mark_failed' ? S.confirm_failed : S.confirm_reset
        const btnColor = action === 'mark_success' ? 'bg-emerald-600 hover:bg-emerald-700'
          : action === 'mark_failed' ? 'bg-red-600 hover:bg-red-700'
          : 'bg-indigo-600 hover:bg-indigo-700'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{confirmText}</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>₪{charge.amount.toFixed(2)} · {charge.organizations?.display_name || charge.organizations?.name || charge.org_id.slice(0, 8)}</p>
                <p className="font-mono text-xs text-gray-400">{charge.id}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmState(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {S.confirm_cancel}
                </button>
                <button
                  onClick={() => handleAction(id, action)}
                  className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors', btnColor)}
                >
                  {S.confirm_yes}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : charges.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {[S.col_date, S.col_org, S.col_plan, S.col_amount, S.col_token, S.col_actions].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                {charges.map(charge => {
                  const plan = charge.payment_installments
                  const org  = charge.organizations
                  const isLoading = !!doing[charge.id]
                  return (
                    <tr key={charge.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="font-medium">{format(new Date(charge.created_at), 'dd.MM HH:mm')}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(charge.created_at), { addSuffix: true, locale: lang === 'ru' ? ru : undefined })}
                        </p>
                      </td>
                      {/* Org */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {(org?.display_name || org?.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                              {org?.display_name || org?.name || charge.org_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{charge.org_id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      {/* Plan */}
                      <td className="px-4 py-3">
                        {plan ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3 text-gray-400" />
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {charge.installment_number} {S.of} {plan.installments_count}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {S.freq[plan.frequency] || plan.frequency}
                              {plan.next_due_date && ` · ${format(new Date(plan.next_due_date), 'dd.MM')}`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-mono">{charge.installment_plan_id.slice(0, 8)}…</span>
                        )}
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-bold text-gray-900 dark:text-gray-100">₪{charge.amount.toFixed(2)}</span>
                        </div>
                      </td>
                      {/* Token */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                          {plan ? maskToken(plan.tranzila_token) : '—'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ActionBtn
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            label={S.mark_success} title={S.tip_success} color="emerald"
                            disabled={isLoading} loading={doing[charge.id] === 'mark_success'}
                            onClick={() => setConfirmState({ id: charge.id, action: 'mark_success' })}
                          />
                          <ActionBtn
                            icon={<XCircle className="w-3.5 h-3.5" />}
                            label={S.mark_failed} title={S.tip_failed} color="red"
                            disabled={isLoading} loading={doing[charge.id] === 'mark_failed'}
                            onClick={() => setConfirmState({ id: charge.id, action: 'mark_failed' })}
                          />
                          <ActionBtn
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                            label={S.reset} title={S.tip_reset} color="indigo"
                            disabled={isLoading} loading={doing[charge.id] === 'reset'}
                            onClick={() => setConfirmState({ id: charge.id, action: 'reset' })}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {charges.map(charge => {
              const plan = charge.payment_installments
              const org  = charge.organizations
              const isLoading = !!doing[charge.id]
              return (
                <div key={charge.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {org?.display_name || org?.name || charge.org_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(charge.created_at), { addSuffix: true, locale: lang === 'ru' ? ru : undefined })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100">₪{charge.amount.toFixed(2)}</p>
                      {plan && (
                        <p className="text-xs text-gray-400">
                          {charge.installment_number}/{plan.installments_count} · {S.freq[plan.frequency] || plan.frequency}
                        </p>
                      )}
                    </div>
                  </div>
                  {plan && (
                    <p className="font-mono text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                      {maskToken(plan.tranzila_token)}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <MobileActionBtn
                      icon={<CheckCircle2 className="w-4 h-4" />} label={S.mark_success} color="emerald"
                      disabled={isLoading} loading={doing[charge.id] === 'mark_success'}
                      onClick={() => setConfirmState({ id: charge.id, action: 'mark_success' })}
                    />
                    <MobileActionBtn
                      icon={<XCircle className="w-4 h-4" />} label={S.mark_failed} color="red"
                      disabled={isLoading} loading={doing[charge.id] === 'mark_failed'}
                      onClick={() => setConfirmState({ id: charge.id, action: 'mark_failed' })}
                    />
                    <MobileActionBtn
                      icon={<RotateCcw className="w-4 h-4" />} label={S.reset} color="indigo"
                      disabled={isLoading} loading={doing[charge.id] === 'reset'}
                      onClick={() => setConfirmState({ id: charge.id, action: 'reset' })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
