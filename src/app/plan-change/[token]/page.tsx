'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, TrendingUp, TrendingDown, ArrowRight, CreditCard, Gift } from 'lucide-react'

interface PlanChangeData {
  request_id:      string
  org_name:        string
  from_plan:       string
  to_plan:         string
  from_price:      number
  to_price:        number
  proration_type:  'upgrade' | 'downgrade' | 'same'
  prorated_amount: number
  credit_amount:   number
  days_left:       number
  next_billing_date: string
  effective_date:  string
  has_card:        boolean
  card_last4:      string | null
}

type PageState = 'loading' | 'ready' | 'confirming' | 'success' | 'redirect_payment' | 'error'

export default function PlanChangePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [state, setState]     = useState<PageState>('loading')
  const [data, setData]       = useState<PlanChangeData | null>(null)
  const [agreed, setAgreed]   = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')

  useEffect(() => {
    fetch(`/api/plan-change/confirm?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setErrorMsg(
            d.error === 'expired'          ? 'הקישור פג תוקף (7 ימים). צור קשר עם Trinity CRM.' :
            d.error === 'already_processed'? 'הבקשה כבר טופלה.' :
            'בקשה לא נמצאה.'
          )
          setState('error')
        } else {
          setData(d)
          setState('ready')
        }
      })
      .catch(() => { setErrorMsg('שגיאה בטעינה.'); setState('error') })
  }, [token])

  const handleConfirm = async () => {
    if (!agreed) return
    setState('confirming')
    try {
      const res  = await fetch('/api/plan-change/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        setErrorMsg(json.message || json.error || 'שגיאה בביצוע השינוי.')
        setState('error')
        return
      }

      if (json.type === 'payment_link_required' && json.payment_url) {
        setPaymentUrl(json.payment_url)
        setState('redirect_payment')
      } else {
        setState('success')
      }
    } catch {
      setErrorMsg('שגיאת רשת. נסה שוב.')
      setState('error')
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">שגיאה</h1>
          <p className="text-gray-500">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center" dir="rtl">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">השינוי בוצע! ✅</h1>
          <p className="text-gray-500 mb-6">
            המנוי שלך עודכן ל-<strong>{data?.to_plan.toUpperCase()}</strong>.
            {data?.proration_type === 'downgrade' && data.credit_amount > 0 &&
              ` זיכוי של ₪${data.credit_amount} יקוזז מהחיוב ב-${data.next_billing_date}.`}
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
            חיוב חודשי מ-{data?.next_billing_date}: ₪{data?.to_price}/חודש
          </div>
        </div>
      </div>
    )
  }

  if (state === 'redirect_payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center" dir="rtl">
          <CreditCard className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">נדרש תשלום</h1>
          <p className="text-gray-500 mb-6">
            אין כרטיס שמור. לחץ להשלמת התשלום ואקטיבציה של {data?.to_plan.toUpperCase()}.
          </p>
          <a
            href={paymentUrl}
            className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl text-center text-lg transition-colors"
          >
            לתשלום ← ₪{data?.prorated_amount}
          </a>
        </div>
      </div>
    )
  }

  // ── Ready state: confirmation form ────────────────────────────────────────
  const isUpgrade   = data!.proration_type === 'upgrade'
  const isDowngrade = data!.proration_type === 'downgrade'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#3949ab] p-6 rounded-t-2xl text-white text-right">
          <p className="text-sm opacity-80 mb-1">Trinity CRM</p>
          <h1 className="text-2xl font-bold">שינוי תוכנית מנוי</h1>
          <p className="text-sm opacity-80 mt-1">{data!.org_name}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6">
          {/* Plan change arrow */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400 mb-1">תוכנית נוכחית</p>
              <p className="font-bold text-gray-700">{data!.from_plan.toUpperCase()}</p>
              <p className="text-sm text-gray-500">₪{data!.from_price}/חודש</p>
            </div>
            <div className="flex flex-col items-center mx-3">
              {isUpgrade
                ? <TrendingUp className="w-8 h-8 text-emerald-500" />
                : <TrendingDown className="w-8 h-8 text-orange-500" />
              }
              <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-400 mb-1">תוכנית חדשה</p>
              <p className={`font-bold ${isUpgrade ? 'text-emerald-600' : 'text-orange-600'}`}>
                {data!.to_plan.toUpperCase()}
              </p>
              <p className="text-sm text-gray-500">₪{data!.to_price}/חודש</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ימים שנותרו בתקופה</span>
              <span className="font-medium">{data!.days_left} ימים</span>
            </div>

            {isUpgrade && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  {data!.has_card
                    ? `יחויב מכרטיס **** ${data!.card_last4}`
                    : 'תשלום בקישור'}
                </span>
                <span className="font-bold text-emerald-600 text-base">₪{data!.prorated_amount}</span>
              </div>
            )}

            {isDowngrade && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  זיכוי לחיוב ב-{data!.next_billing_date}
                </span>
                <span className="font-bold text-indigo-600 text-base">₪{data!.credit_amount}</span>
              </div>
            )}

            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-gray-500">חיוב חודשי מ-{data!.next_billing_date}</span>
              <span className="font-bold">₪{data!.to_price}/חודש</span>
            </div>
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-colors mb-5"
            onClick={() => setAgreed(v => !v)}>
            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
              {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-sm text-gray-700 leading-snug">
              {isUpgrade
                ? `אני מאשר/ת חיוב חד-פעמי של ₪${data!.prorated_amount} עבור שדרוג המנוי ל-${data!.to_plan.toUpperCase()}.`
                : `אני מאשר/ת הורדת המנוי ל-${data!.to_plan.toUpperCase()} וקבלת זיכוי של ₪${data!.credit_amount} לחיוב הבא.`}
            </span>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!agreed || state === 'confirming'}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {state === 'confirming'
              ? <><Loader2 className="w-5 h-5 animate-spin" />מעבד...</>
              : <>✅ אשר שינוי תוכנית</>}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            השינוי ייכנס לתוקף מיידית לאחר האישור
          </p>
        </div>
      </div>
    </div>
  )
}
