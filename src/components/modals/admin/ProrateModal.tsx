'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import Modal from '@/components/ui/Modal'
import { PLAN_PRICES, ProratePreview } from '@/lib/proration'
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Loader2, TrendingUp } from 'lucide-react'

interface Org {
  id: string
  name: string
  plan?: string
  billing_amount?: number
  billing_due_date?: string
  subscription_expires_at?: string | null
}

interface Props {
  open: boolean
  org: Org | null
  onClose: () => void
  onSuccess: () => void
}

const PLANS = [
  { key: 'base',       label: 'Base',       price: 199 },
  { key: 'pro',        label: 'Pro',        price: 249 },
  { key: 'enterprise', label: 'Enterprise', price: 499 },
]

export function ProrateModal({ open, org, onClose, onSuccess }: Props) {
  const { language } = useLanguage()
  const isHe = language === 'he'

  const [selectedPlan, setSelectedPlan] = useState<string>('pro')
  const [customPrice, setCustomPrice]   = useState<string>('')
  const [preview, setPreview]           = useState<ProratePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying]         = useState(false)

  const currentPlan  = org?.plan ?? 'base'
  const currentPrice = org?.billing_amount ?? PLAN_PRICES[currentPlan] ?? 199

  useEffect(() => {
    if (!open || !org) return
    setSelectedPlan(currentPlan === 'base' ? 'pro' : currentPlan === 'pro' ? 'enterprise' : 'base')
    setCustomPrice('')
    setPreview(null)
  }, [open, org])

  useEffect(() => {
    if (!open || !org || !selectedPlan) return
    const t = setTimeout(() => fetchPreview(), 300)
    return () => clearTimeout(t)
  }, [selectedPlan, customPrice, open, org])

  const fetchPreview = async () => {
    if (!org) return
    setLoadingPreview(true)
    try {
      const params = new URLSearchParams({ org_id: org.id, to_plan: selectedPlan })
      if (customPrice) params.set('to_price', customPrice)
      const res = await fetch(`/api/admin/prorate?${params}`)
      const data = await res.json()
      if (data.preview) setPreview(data.preview)
    } catch { /* silent */ } finally {
      setLoadingPreview(false)
    }
  }

  const handleApply = async () => {
    if (!org || !preview) return
    setApplying(true)
    try {
      const res = await fetch('/api/admin/prorate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id:   org.id,
          to_plan:  selectedPlan,
          to_price: customPrice ? parseFloat(customPrice) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error')

      if (data.type === 'upgrade' && data.payment_url) {
        toast.success(isHe ? 'קישור תשלום נשלח ללקוח!' : 'Ссылка на оплату отправлена клиенту!')
      } else if (data.type === 'downgrade_scheduled') {
        toast.success(isHe ? `הורדת מנוי מתוזמנת ל-${preview.effectiveDate}` : `Downgrade запланирован на ${preview.effectiveDate}`)
      } else {
        toast.success(isHe ? 'עודכן בהצלחה' : 'Обновлено успешно')
      }

      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setApplying(false)
    }
  }

  if (!org) return null

  const typeIcon = {
    upgrade:   <ArrowUpCircle className="w-5 h-5 text-emerald-500" />,
    downgrade: <ArrowDownCircle className="w-5 h-5 text-orange-500" />,
    same:      <MinusCircle className="w-5 h-5 text-blue-500" />,
  }

  const typeColor = {
    upgrade:   'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30',
    downgrade: 'border-orange-200 bg-orange-50 dark:bg-orange-950/30',
    same:      'border-blue-200 bg-blue-50 dark:bg-blue-950/30',
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isHe ? 'שינוי תכנית' : 'Смена тарифа'}
            </h2>
            <p className="text-sm text-gray-500">{org.name}</p>
          </div>
        </div>

        {/* Current plan */}
        <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">{isHe ? 'תכנית נוכחית' : 'Текущий тариф'}</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {currentPlan.toUpperCase()} — ₪{currentPrice}/мес
          </p>
        </div>

        {/* Plan selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isHe ? 'תכנית חדשה' : 'Новый тариф'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map(p => (
              <button
                key={p.key}
                onClick={() => { setSelectedPlan(p.key); setCustomPrice('') }}
                className={`py-3 px-2 rounded-xl border-2 text-center transition-all ${
                  selectedPlan === p.key && !customPrice
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-sm text-gray-900 dark:text-white">{p.label}</p>
                <p className="text-xs text-gray-500">₪{p.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom price */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {isHe ? 'מחיר מותאם (₪/חודש)' : 'Кастомная цена (₪/мес)'}
          </label>
          <input
            type="number"
            min={1}
            value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            placeholder={isHe ? 'השאר ריק לשימוש במחיר סטנדרטי' : 'Оставить пустым = стандартная цена'}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Preview */}
        {loadingPreview && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        )}

        {preview && !loadingPreview && (
          <div className={`rounded-xl border p-4 mb-5 ${typeColor[preview.type]}`}>
            <div className="flex items-start gap-2 mb-3">
              {typeIcon[preview.type]}
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {isHe ? preview.message_he : preview.message_ru}
              </p>
            </div>
            {preview.type === 'upgrade' && preview.proratedAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isHe ? 'חיוב חד-פעמי עכשיו' : 'Единовременный платёж сейчас'}
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">
                    ₪{preview.proratedAmount}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isHe ? 'מ-' : 'С '}{preview.nextBillingDate}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    ₪{preview.toPrice}/мес
                  </span>
                </div>
              </div>
            )}
            {preview.type === 'downgrade' && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                {isHe
                  ? 'אין חזר כספי — המנוי הנוכחי ממשיך עד סוף התקופה'
                  : 'Возврат не делается — текущий период продолжается до конца'}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button
            onClick={handleApply}
            disabled={!preview || applying || loadingPreview || selectedPlan === currentPlan}
            className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            {preview?.type === 'upgrade'
              ? (isHe ? 'שלח קישור תשלום' : 'Отправить ссылку на оплату')
              : preview?.type === 'downgrade'
              ? (isHe ? 'תזמן הורדת מנוי' : 'Запланировать downgrade')
              : (isHe ? 'עדכן' : 'Обновить')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
