'use client'

import { useEffect } from 'react'
import {
  Package, Wrench, Receipt, CheckCircle2, Clock,
  AlertCircle, Ban, TrendingUp, Hash, ShoppingBag,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Sale } from '@/hooks/useSales'
import { useQueryClient } from '@tanstack/react-query'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'

const T = {
  he: {
    title: 'פרטי עסקה', method: 'שיטת תשלום', items: 'פריטים',
    total: 'סה״כ', paid: 'שולם', balance: 'יתרה', receipt: 'חשבונית',
    notes: 'הערות', close: 'סגור', unknown: 'לקוח לא ידוע',
    cash: 'מזומן', card: 'כרטיס', bit: 'ביט', transfer: 'העברה',
    paid_status: 'שולם', partial_status: 'חלקי', new_status: 'חדש',
    refunded_status: 'הוחזר', cancelled_status: 'בוטל',
    receipt_sent: 'חשבונית נשלחה', receipt_not_sent: 'חשבונית לא נשלחה',
  },
  ru: {
    title: 'Детали сделки', method: 'Оплата', items: 'Позиции',
    total: 'Итого', paid: 'Оплачено', balance: 'Остаток', receipt: 'Чек',
    notes: 'Примечания', close: 'Закрыть', unknown: 'Клиент не найден',
    cash: 'Наличные', card: 'Карта', bit: 'Bit', transfer: 'Перевод',
    paid_status: 'Оплачено', partial_status: 'Частично', new_status: 'Новая',
    refunded_status: 'Возврат', cancelled_status: 'Отменено',
    receipt_sent: 'Чек отправлен', receipt_not_sent: 'Чек не выбит',
  },
}

const METHOD_ICON: Record<string, string> = {
  cash: '💵', card: '💳', credit_card: '💳', bit: '📱', transfer: '🏦',
}

const STATUS_CONFIG = {
  paid:      { icon: <CheckCircle2 size={12} />, color: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.3)',  barColor: '#34d399' },
  partial:   { icon: <Clock size={12} />,         color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)',  barColor: '#fbbf24' },
  new:       { icon: <AlertCircle size={12} />,   color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', barColor: '#a78bfa' },
  refunded:  { icon: <TrendingUp size={12} />,    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', barColor: '#94a3b8' },
  cancelled: { icon: <Ban size={12} />,            color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', barColor: '#64748b' },
}

const AVATAR_GRADIENTS = [
  ['#a78bfa', '#7c3aed'], ['#34d399', '#059669'], ['#60a5fa', '#2563eb'],
  ['#f472b6', '#db2777'], ['#fb923c', '#ea580c'], ['#38bdf8', '#0284c7'],
]

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}
function getGradient(name: string) {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]
}
function getClientName(sale: Sale, t: typeof T['ru']) {
  if (sale.clients) return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  return t.unknown
}

interface Props { sale: Sale | null; locale: 'he' | 'ru'; onClose: () => void }

export function SaleDetailModal({ sale, locale, onClose }: Props) {
  const t = T[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const queryClient = useQueryClient()

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
  const clientName = getClientName(sale, t)
  const [g1, g2] = getGradient(clientName)
  const initials = getInitials(clientName)

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: `0 6px 20px ${g2}55`, letterSpacing: '-0.5px' }}>
          {initials || <ShoppingBag size={22} />}
        </div>
      </div>

      {/* Date badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: 20 }}>{sale.sale_date}</span>
      </div>

      {/* Amount card */}
      <div style={{ background: `${st.color}14`, border: `0.5px solid ${st.border}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: st.color, letterSpacing: '-1px', lineHeight: 1 }}>₪{total.toLocaleString()}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ color: st.color }}>{st.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
        <div style={{ height: '100%', width: `${paidPct}%`, background: `linear-gradient(90deg, ${st.barColor}99, ${st.barColor})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 12 }}>
        <span>{t.paid}: ₪{paid.toLocaleString()}</span>
        <span style={{ color: '#64748b' }}>{paidPct}%</span>
      </div>
      {balance > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 9, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#fbbf24' }}>{t.balance}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>₪{balance.toLocaleString()}</span>
        </div>
      )}

      {/* Method */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{methodIcon}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{methodLabel}</span>
      </div>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />

      {/* Close */}
      <button onClick={onClose} style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
        {t.close}
      </button>
    </div>
  )

  return (
    <Modal open={!!sale} onClose={onClose} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={!!sale} onClose={onClose} icon={<ShoppingBag />} title={clientName} subtitle={t.title} dir={dir} sidebarExtra={sidebar}
        footerContent={
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <AdminDeleteButton type="sale" id={sale.id}
              onDeleted={() => { onClose(); queryClient.invalidateQueries({ queryKey: ['sales'] }) }} />
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1e293b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {t.close}
            </button>
          </div>
        }
      >
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">

          {/* ── Stats row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Method */}
            <div style={{ background: 'linear-gradient(135deg, #f8faff, #eff2ff)', border: '0.5px solid #e0e7ff', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.method}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{methodIcon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{methodLabel}</span>
              </div>
            </div>
            {/* Receipt */}
            <div style={{ background: sale.receipt_sent ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: `0.5px solid ${sale.receipt_sent ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.receipt}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Receipt size={16} color={sale.receipt_sent ? '#22c55e' : '#cbd5e1'} />
                <span style={{ fontSize: 12, fontWeight: 600, color: sale.receipt_sent ? '#16a34a' : '#94a3b8' }}>
                  {sale.receipt_sent ? t.receipt_sent : t.receipt_not_sent}
                </span>
              </div>
            </div>
          </div>

          {/* ── Items ──────────────────────────────────────────────── */}
          {sale.sale_items && sale.sale_items.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.items}</p>
              <div style={{ border: '0.5px solid #e8edf4', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                {sale.sale_items.map((item, idx) => {
                  const isProduct = !!item.product_id
                  const itemTotal = Number(item.total_price || item.quantity * item.unit_price)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: idx > 0 ? '0.5px solid #f1f5f9' : 'none' }}>
                      {/* Icon */}
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: isProduct ? '#fef3c7' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isProduct
                          ? <Package size={15} color="#d97706" />
                          : <Wrench size={15} color="#7c3aed" />
                        }
                      </div>
                      {/* Name + qty */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item.product_name}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{item.quantity} × ₪{Number(item.unit_price).toLocaleString()}</p>
                      </div>
                      {/* Total */}
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>₪{itemTotal.toLocaleString()}</span>
                    </div>
                  )
                })}
                {/* Total row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'linear-gradient(90deg, #1e293b, #0f172a)', borderTop: '0.5px solid #e8edf4' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.total}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>₪{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Notes ─────────────────────────────────────────────── */}
          {sale.notes && (
            <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '0.5px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.notes}</p>
              <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{sale.notes}</p>
            </div>
          )}

          {/* ── Sale ID ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={10} color="#cbd5e1" />
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>{sale.id}</span>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}
