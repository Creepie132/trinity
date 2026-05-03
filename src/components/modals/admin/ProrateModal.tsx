'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import Modal from '@/components/ui/Modal'
import { PLAN_PRICES, ProratePreview } from '@/lib/proration'
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Loader2, TrendingUp, Copy, Check, CreditCard, Gift, ExternalLink } from 'lucide-react'

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

  const [selectedPlan,  setSelectedPlan]  = useState<string>('pro')
  const [customPrice,   setCustomPrice]   = useState<string>('')
  const [preview,       setPreview]       = useState<(ProratePreview & { has_card_token?: boolean; card_last4?: string | null }) | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying,      setApplying]      = useState(false)
  const [confirmUrl,    setConfirmUrl]    = useState<string | null>(null)
  const [copied,        setCopied]        = useState(false)

  const currentPlan = org?.plan ?? 'base'

  useEffect(() => {
    if (!open || !org) return
    setSelectedPlan(currentPlan === 'base' ? 'pro' : currentPlan === 'pro' ? 'enterprise' : 'base')
    setCustomPrice('')
    setPreview(null)
    setConfirmUrl(null)
    setCopied(false)
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
      const res  = await fetch(`/api/admin/prorate?${params}`)
      const data = await res.json()
      if (data.preview) setPreview({ ...data.preview, has_card_token: data.has_card_token, card_last4: data.card_last4 })
    } catch { /* silent */ } finally { setLoadingPreview(false) }
  }

  const handleSendRequest = async () => {
    if (!org || !preview) return
    setApplying(true)
    try {
      const res  = await fetch('/api/admin/prorate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          org_id:   org.id,
          to_plan:  selectedPlan,
          to_price: customPrice ? parseFloat(customPrice) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error')

      setConfirmUrl(data.confirm_url)
      toast.success(
        data.email_sent
          ? (isHe ? 'אימייל אישור נשלח ללקוח!' : 'Email с подтверждением отправлен клиенту!')
          : (isHe ? 'קישור אישור נוצר' : 'Ссылка создана — у клиента нет email'),
        { duration: 5000 }
      )
    } catch (e: any) {
      toast.error(e.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally { setApplying(false) }
  }

  const copyUrl = () => {
    if (!confirmUrl) return
    navigator.clipboard.writeText(confirmUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  // ── Sent state ────────────────────────────────────────────────────────────
  if (confirmUrl) {
    return (
      <Modal open={open} onClose={() => { onSuccess(); onClose() }} size="md">
        <div className="p-1 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {isHe ? 'קישור אישור נשלח!' : 'Ссылка подтверждения создана!'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {isHe
              ? 'הלקוח יקבל אימייל עם קישור אישור. הוא/היא יצטרכו לאשר את השינוי.'
              : 'Клиент получит email со ссылкой подтверждения. Он должен поставить галочку и подтвердить.'}
          </p>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-5 text-left">
            <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">{confirmUrl}</span>
            <button onClick={copyUrl} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          <button
            onClick={() => { onSuccess(); onClose() }}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700"
          >
            {isHe ? 'סגור' : 'Закрыть'}
          </button>
        </div>
      </Modal>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
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
            {currentPlan.toUpperCase()} — ₪{org.billing_amount ?? PLAN_PRICES[currentPlan] ?? 199}/мес
          </p>
        </div>

        {/* Plan selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isHe ? 'תכנית חדשה' : 'Новый тариф'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map(p => (
              <button key={p.key} onClick={() => { setSelectedPlan(p.key); setCustomPrice('') }}
                className={`py-3 px-2 rounded-xl border-2 text-center transition-all ${
                  selectedPlan === p.key && !customPrice
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}>
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
          <input type="number" min={1} value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            placeholder={isHe ? 'ריק = מחיר סטנדרטי' : 'Пусто = стандартная цена'}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
              <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    {preview.has_card_token
                      ? (isHe ? `יחויב מכרטיס **** ${preview.card_last4}` : `Со карты **** ${preview.card_last4}`)
                      : (isHe ? 'יישלח קישור לתשלום' : 'Отправим ссылку на оплату')}
                  </span>
                  <span className="font-bold text-emerald-700 text-lg">₪{preview.proratedAmount}</span>
                </div>
              </div>
            )}
            {preview.type === 'downgrade' && preview.creditAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    {isHe ? `זיכוי לחיוב ב-${preview.nextBillingDate}` : `Кредит на ${preview.nextBillingDate}`}
                  </span>
                  <span className="font-bold text-indigo-600 text-lg">₪{preview.creditAmount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-gray-400 mb-4 text-center">
          {isHe
            ? 'יישלח אימייל ללקוח עם קישור אישור. השינוי ייכנס לתוקף רק לאחר אישורו.'
            : 'Клиент получит email со ссылкой. Изменение вступит в силу только после его подтверждения.'}
        </p>

        {/* Footer */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            {isHe ? 'ביטול' : 'Отмена'}
          </button>
          <button onClick={handleSendRequest}
            disabled={!preview || applying || loadingPreview || selectedPlan === currentPlan}
            className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            {isHe ? 'שלח בקשת אישור ללקוח' : 'Отправить запрос клиенту'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
