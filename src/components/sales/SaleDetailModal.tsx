'use client'

import { useEffect } from 'react'
import {
  Calendar, Package, Wrench, Receipt,
  CheckCircle2, Clock, AlertCircle, Ban, TrendingUp, Hash, ShoppingBag,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
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

const METHOD_ICON: Record<string, string> = {
  cash: '💵', card: '💳', bit: '📱', transfer: '🏦', credit_card: '💳',
}

const STATUS_CONFIG = {
  paid:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={14} />, bar: 'bg-emerald-500', color: '#34d399' },
  partial:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: <Clock size={14} />,         bar: 'bg-amber-500',   color: '#fbbf24' },
  new:       { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: <AlertCircle size={14} />,   bar: 'bg-violet-500',  color: '#a78bfa' },
  refunded:  { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    icon: <TrendingUp size={14} />,    bar: 'bg-gray-400',    color: '#94a3b8' },
  cancelled: { bg: 'bg-gray-50',    text: 'text-gray-400',    border: 'border-gray-200',    icon: <Ban size={14} />,           bar: 'bg-gray-300',    color: '#64748b' },
}

function getClientName(sale: Sale, t: typeof T['ru']) {
  if (sale.clients) return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  return t.unknown
}

interface Props {
  sale: Sale | null
  locale: 'he' | 'ru'
  onClose: () => void
}

export function SaleDetailModal({ sale, locale, onClose }: Props) {
  const t = T[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  if (!sale) return null

  const st = STATUS_CONFIG[sale.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new
  const statusLabel = t[`${sale.status}_status` as keyof typeof t] || sale.status
  const methodLabel = t[sale.payment_method as keyof typeof t] || sale.payment_method || t.cash
  const methodIcon  = METHOD_ICON[sale.payment_method || 'cash'] || '💵'
  const total   = Number(sale.total_amount)
  const paid    = Number(sale.paid_amount)
  const balance = Math.max(0, total - paid)
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100

  return (
    <Modal
      open={!!sale}
      onClose={onClose}
      darkHeader
      width="680px"
      dir={dir}
      contentClassName="!p-0"
    >
      <TrinityModalShell
        open={!!sale}
        onClose={onClose}
        icon={<ShoppingBag />}
        title={getClientName(sale, t)}
        subtitle={sale.sale_date}
        dir={dir}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Amount */}
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 10px', textAlign: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: st.color }}>₪{total.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{statusLabel}</div>
            </div>
            {/* Progress */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${paidPct}%`, background: st.color, transition: 'width 0.7s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 4 }}>
              {t.paid}: ₪{paid.toLocaleString()} ({paidPct}%)
              {balance > 0 && <span style={{ color: '#fbbf24', marginLeft: 6 }}>{t.balance}: ₪{balance.toLocaleString()}</span>}
            </div>
            {/* Method */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
              <span style={{ fontSize: 16 }}>{methodIcon}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{methodLabel}</span>
            </div>
            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <button
              onClick={onClose}
              style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer' }}
            >
              {t.close}
            </button>
          </div>
        }
      >
        <div style={{ padding: '16px 16px 20px' }} className="space-y-4">

          {/* Payment method + receipt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-lg">{methodIcon}</span>
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
                {sale.sale_items.map((item) => {
                  const isProduct = !!item.product_id
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
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
      </TrinityModalShell>
    </Modal>
  )
}
