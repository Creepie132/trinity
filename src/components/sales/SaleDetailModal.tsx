'use client'

import { useEffect, useRef } from 'react'
import {
  X, User, Calendar, CreditCard, Package, Wrench, Receipt,
  CheckCircle2, Clock, AlertCircle, Ban, TrendingUp, Hash,
} from 'lucide-react'
import { Sale } from '@/hooks/useSales'

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  he: {
    title: 'פרטי עסקה', client: 'לקוח', date: 'תאריך', method: 'שיטת תשלום',
    staff: 'עובד', items: 'פריטים', total: 'סה״כ', paid: 'שולם', balance: 'יתרה',
    receipt: 'חשבונית', status: 'סטטוס', notes: 'הערות', close: 'סגור',
    unknown: 'לקוח לא ידוע', qty: 'כמות', price: 'מחיר', subtotal: 'סכום',
    cash: 'מזומן', card: 'כרטיס', bit: 'ביט', transfer: 'העברה',
    paid_status: 'שולם', partial_status: 'חלקי', new_status: 'חדש',
    refunded_status: 'הוחזר', cancelled_status: 'בוטל',
    receipt_sent: 'חשבונית נשלחה', receipt_not_sent: 'חשבונית לא נשלחה',
  },
  ru: {
    title: 'Детали сделки', client: 'Клиент', date: 'Дата', method: 'Способ оплаты',
    staff: 'Мастер', items: 'Позиции', total: 'Итого', paid: 'Оплачено', balance: 'Остаток',
    receipt: 'Чек', status: 'Статус', notes: 'Примечания', close: 'Закрыть',
    unknown: 'Клиент не найден', qty: 'Кол-во', price: 'Цена', subtotal: 'Сумма',
    cash: 'Наличные', card: 'Карта', bit: 'Bit', transfer: 'Перевод',
    paid_status: 'Оплачено', partial_status: 'Частично', new_status: 'Новая',
    refunded_status: 'Возврат', cancelled_status: 'Отменено',
    receipt_sent: 'Чек отправлен', receipt_not_sent: 'Чек не выбит',
  },
}

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <span className="text-lg">💵</span>,
  card: <span className="text-lg">💳</span>,
  bit: <span className="text-lg">📱</span>,
  transfer: <span className="text-lg">🏦</span>,
  credit_card: <span className="text-lg">💳</span>,
}

const STATUS_CONFIG = {
  paid:      { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: <CheckCircle2 size={14} />, bar: 'bg-emerald-500' },
  partial:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-800',   icon: <Clock size={14} />,         bar: 'bg-amber-500' },
  new:       { bg: 'bg-violet-50 dark:bg-violet-900/20',   text: 'text-violet-700 dark:text-violet-400',   border: 'border-violet-200 dark:border-violet-800', icon: <AlertCircle size={14} />,   bar: 'bg-violet-500' },
  refunded:  { bg: 'bg-gray-50 dark:bg-gray-800',          text: 'text-gray-500 dark:text-gray-400',       border: 'border-gray-200 dark:border-gray-700',     icon: <TrendingUp size={14} />,    bar: 'bg-gray-400' },
  cancelled: { bg: 'bg-gray-50 dark:bg-gray-800',          text: 'text-gray-400 dark:text-gray-500',       border: 'border-gray-200 dark:border-gray-700',     icon: <Ban size={14} />,           bar: 'bg-gray-300' },
}

function clientName(sale: Sale, t: typeof T['ru']) {
  if (sale.clients) return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  return t.unknown
}
function initials(sale: Sale) {
  const f = sale.clients?.first_name || ''; const l = sale.clients?.last_name || ''
  return `${f[0] || ''}${l[0] || ''}`.toUpperCase() || '?'
}
const AV = ['from-violet-400 to-purple-500','from-emerald-400 to-teal-500','from-orange-400 to-red-500','from-blue-400 to-indigo-500','from-pink-400 to-rose-500','from-teal-400 to-cyan-500']
function avGrad(sale: Sale) {
  return AV[(sale.clients?.first_name?.charCodeAt(0) || 0) % AV.length]
}

interface Props {
  sale: Sale | null
  locale: 'he' | 'ru'
  onClose: () => void
}

export function SaleDetailModal({ sale, locale, onClose }: Props) {
  const t = T[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Lock scroll
  useEffect(() => {
    if (sale) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [sale])

  if (!sale) return null

  const st = STATUS_CONFIG[sale.status] || STATUS_CONFIG.new
  const statusLabel = t[`${sale.status}_status` as keyof typeof t] || sale.status
  const methodLabel = t[sale.payment_method as keyof typeof t] || sale.payment_method || t.cash
  const methodIcon  = METHOD_ICON[sale.payment_method || 'cash'] || METHOD_ICON.cash
  const total  = Number(sale.total_amount)
  const paid   = Number(sale.paid_amount)
  const balance = Math.max(0, total - paid)
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        dir={dir}
        className="bg-white dark:bg-gray-900 w-full max-w-md md:rounded-2xl rounded-t-2xl
          shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{ animation: 'saleDetailIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* ── Top gradient banner ───────────────────────────────────────── */}
        <div className={`relative bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] px-5 pt-5 pb-14`}>
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all text-white"
          >
            <X size={16} />
          </button>
          <p className="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">{t.title}</p>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avGrad(sale)} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
              {initials(sale)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{clientName(sale, t)}</h2>
              <p className="text-sm text-white/60 flex items-center gap-1.5">
                <Calendar size={11} />
                {sale.sale_date}
                {sale.staff_name && (
                  <span className="ms-2 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    {sale.staff_name}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Amount card — overlaps banner ─────────────────────────────── */}
        <div className="px-5 -mt-8 mb-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.total}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₪{total.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${st.bg} ${st.text} ${st.border}`}>
                {st.icon}{statusLabel}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${st.bar}`}
                style={{ width: `${paidPct}%`, animation: 'growBar 0.8s 0.3s ease both' }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                {t.paid}: ₪{paid.toLocaleString()} ({paidPct}%)
              </span>
              {balance > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Clock size={11} />
                  {t.balance}: ₪{balance.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Payment method + receipt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center gap-2.5">
              {methodIcon}
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t.method}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{methodLabel}</p>
              </div>
            </div>
            <div className={`rounded-xl p-3 flex items-center gap-2.5 ${sale.receipt_sent ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
              <Receipt size={18} className={sale.receipt_sent ? 'text-emerald-500' : 'text-gray-300'} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t.receipt}</p>
                <p className={`text-xs font-semibold truncate ${sale.receipt_sent ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400'}`}>
                  {sale.receipt_sent ? t.receipt_sent : t.receipt_not_sent}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          {sale.sale_items && sale.sale_items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t.items}</p>
              <div className="space-y-2">
                {sale.sale_items.map((item, idx) => {
                  const isProduct = !!item.product_id
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5"
                      style={{ animation: `fadeInUp 0.25s ${idx * 0.06}s ease both` }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isProduct ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                        {isProduct
                          ? <Package size={14} className="text-amber-600 dark:text-amber-400" />
                          : <Wrench size={14} className="text-violet-600 dark:text-violet-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-400">{item.quantity} × ₪{Number(item.unit_price).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
                        ₪{Number(item.total_price || item.quantity * item.unit_price).toLocaleString()}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Total row */}
              <div className="flex items-center justify-between mt-3 px-3 py-2 bg-gray-900 dark:bg-gray-950 rounded-xl">
                <span className="text-sm font-semibold text-white/70">{t.total}</span>
                <span className="text-lg font-black text-white">₪{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">{t.notes}</p>
              <p className="text-sm text-amber-900 dark:text-amber-300">{sale.notes}</p>
            </div>
          )}

          {/* Sale ID */}
          <div className="flex items-center gap-2 text-xs text-gray-300 dark:text-gray-600">
            <Hash size={10} />
            <span className="font-mono">{sale.id}</span>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
          >
            {t.close}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes saleDetailIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes growBar {
          from { width: 0 !important; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
