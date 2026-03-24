'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, CheckCircle, Phone, Navigation } from 'lucide-react'

// Live clock
function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return <span className="tabular-nums">{t.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
}

// Live delivery timer
function DeliveryTimer({ startedAt }: { startedAt: number }) {
  const [s, setS] = useState(Math.floor((Date.now() - startedAt) / 1000))
  useEffect(() => { const id = setInterval(() => setS(Math.floor((Date.now() - startedAt) / 1000)), 1000); return () => clearInterval(id) }, [startedAt])
  const m = Math.floor(s / 60), sec = s % 60
  const over = m >= 25
  return (
    <div className={`text-center rounded-2xl p-4 ${over ? 'bg-red-50 border-2 border-red-200' : 'bg-blue-50 border-2 border-blue-100'}`}>
      <div className={`text-4xl font-black tabular-nums ${over ? 'text-red-600' : 'text-blue-700'}`}>
        {m}:{sec.toString().padStart(2, '0')}
      </div>
      <div className={`text-xs font-semibold mt-1 ${over ? 'text-red-500' : 'text-blue-500'}`}>
        {over ? '⚠️ איחור — אנא מהר!' : '⏱ זמן מאז איסוף'}
      </div>
    </div>
  )
}

const ORDERS = [
  { id: 101, from: 'הרצל 22', to: 'בן גוריון 45', items: ['וויסקי 700מל ×1', 'יין אדום ×2'], amount: 340, startedAt: Date.now() - 7 * 60000 },
  { id: 102, from: 'מחסן מרכזי', to: 'רוטשילד 8', items: ['בירה קרטון ×1'], amount: 89, startedAt: null },
  { id: 103, from: 'מחסן מרכזי', to: "ז'בוטינסקי 15", items: ['ווודקה ×1', 'מיצים ×3'], amount: 156, startedAt: null },
]

export default function WorkerViewPage() {
  const [orders, setOrders] = useState(ORDERS)
  const [done, setDone] = useState<number[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const activeOrder = orders.find(o => o.startedAt !== null && !done.includes(o.id))
  const earnToday = done.length * 20 + 280 // base + completed

  const completeOrder = (id: number) => {
    setDone(d => [...d, id])
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2500)
    setOrders(prev => {
      const next = [...prev]
      const nextPending = next.find(o => o.startedAt === null)
      if (nextPending) nextPending.startedAt = Date.now()
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold animate-bounce">
          <CheckCircle className="w-5 h-5"/> הזמנה הושלמה! +₪20
        </div>
      )}

      {/* Phone frame wrapper */}
      <div className="max-w-sm mx-auto">
        {/* Status bar */}
        <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex justify-between items-center">
          <Clock/>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>GPS פעיל
          </span>
        </div>

        {/* App header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <Link href="/admin/presentations/courier"
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
              <ChevronLeft className="w-4 h-4 rotate-180"/>חזור
            </Link>
            <div className="text-center">
              <div className="text-white font-black text-lg">Trinity Courier</div>
              <div className="text-slate-400 text-xs">דניאל כהן — משמרת פעילה</div>
            </div>
            <div className="text-left">
              <div className="text-emerald-400 font-black text-lg">₪{earnToday}</div>
              <div className="text-slate-500 text-xs">שכר היום</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="bg-slate-800 px-4 pb-3 grid grid-cols-3 gap-2">
          {[
            { label: 'הזמנות', value: String(orders.filter(o => done.includes(o.id)).length + 14) },
            { label: 'ממתינות', value: String(orders.filter(o => !done.includes(o.id)).length) },
            { label: 'זמן ממוצע', value: "18'" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-700/60 rounded-xl p-2 text-center">
              <div className="text-white font-black text-lg tabular-nums">{s.value}</div>
              <div className="text-slate-400 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Active order */}
          {activeOrder && !done.includes(activeOrder.id) && (
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-blue-200">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                <span className="text-white font-black text-sm">הזמנה פעילה #{activeOrder.id}</span>
              </div>
              <div className="p-4 space-y-3">
                <DeliveryTimer startedAt={activeOrder.startedAt!}/>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">A</div>
                    <div>
                      <div className="text-xs text-gray-400">איסוף</div>
                      <div className="font-bold text-gray-900 text-sm">{activeOrder.from}</div>
                    </div>
                  </div>
                  <div className="flex justify-center"><div className="w-0.5 h-4 bg-gray-200"/></div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs flex-shrink-0">B</div>
                    <div>
                      <div className="text-xs text-gray-400">מסירה</div>
                      <div className="font-bold text-gray-900 text-sm">{activeOrder.to}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1.5">פריטים בהזמנה</div>
                  {activeOrder.items.map((item, i) => (
                    <div key={i} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <span className="text-gray-300">•</span>{item}
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-xs text-gray-400">סכום לגבייה</span>
                    <span className="font-black text-gray-900">₪{activeOrder.amount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a href="tel:050-1234567"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors">
                    <Phone className="w-4 h-4"/>התקשר
                  </a>
                  <Link href={`https://waze.com/ul?q=${encodeURIComponent(activeOrder.to)}`} target="_blank"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-100 text-blue-700 font-bold text-sm hover:bg-blue-200 transition-colors">
                    <Navigation className="w-4 h-4"/>נווט
                  </Link>
                </div>

                <button onClick={() => completeOrder(activeOrder.id)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5"/>הזמנה הושלמה ✓
                </button>
              </div>
            </div>
          )}

          {/* Pending orders queue */}
          <div>
            <div className="text-sm font-bold text-gray-500 mb-2 px-1">📋 תור הזמנות</div>
            <div className="space-y-2">
              {orders.filter(o => !done.includes(o.id) && o !== activeOrder).map((o, i) => (
                <div key={o.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-sm flex-shrink-0">
                    {i + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{o.to}</div>
                    <div className="text-xs text-gray-400">{o.items.length} פריטים · ₪{o.amount}</div>
                  </div>
                  <div className="text-xs text-gray-300 font-medium">ממתין</div>
                </div>
              ))}
              {orders.filter(o => !done.includes(o.id) && o !== activeOrder).length === 0 && (
                <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="text-emerald-700 font-bold text-sm">כל ההזמנות הושלמו!</div>
                  <div className="text-emerald-600 text-xs mt-0.5">עבודה מעולה היום</div>
                </div>
              )}
            </div>
          </div>

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <div className="text-sm font-bold text-gray-500 mb-2 px-1">✅ הושלמו</div>
              <div className="space-y-2">
                {orders.filter(o => done.includes(o.id)).map(o => (
                  <div key={o.id} className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-center gap-3 opacity-70">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-700 text-sm truncate">{o.to}</div>
                      <div className="text-xs text-gray-400">₪{o.amount} · +₪20 שכר</div>
                    </div>
                    <div className="text-emerald-600 font-black text-sm">✓</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
