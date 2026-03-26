'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Package, Wrench, Receipt, CheckCircle2, Clock,
  AlertCircle, Ban, TrendingUp, Hash, ShoppingBag, CreditCard, Trash2,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Sale } from '@/hooks/useSales'
import { useQueryClient } from '@tanstack/react-query'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { useRouter } from 'next/navigation'

const T = {
  he: {
    title: 'פרטי עסקה', method: 'שיטת תשלום', items: 'פריטים',
    total: 'סה״כ', paid: 'שולם', balance: 'יתרה', receipt: 'חשבונית',
    notes: 'הערות', close: 'סגור', unknown: 'לקוח לא ידוע',
    cash: 'מזומן', card: 'כרטיס', bit: 'ביט', transfer: 'העברה',
    paid_status: 'שולם', partial_status: 'חלקי', new_status: 'חדש',
    refunded_status: 'הוחזר', cancelled_status: 'בוטל',
    receipt_sent: 'חשבונית נשלחה', receipt_not_sent: 'חשבונית לא נשלחה',
    goToPayments: 'עבור לתשלומים', delete: 'מחק',
  },
  ru: {
    title: 'Детали сделки', method: 'Оплата', items: 'Позиции',
    total: 'Итого', paid: 'Оплачено', balance: 'Остаток', receipt: 'Чек',
    notes: 'Примечания', close: 'Закрыть', unknown: 'Клиент не найден',
    cash: 'Наличные', card: 'Карта', bit: 'Bit', transfer: 'Перевод',
    paid_status: 'Оплачено', partial_status: 'Частично', new_status: 'Новая',
    refunded_status: 'Возврат', cancelled_status: 'Отменено',
    receipt_sent: 'Чек отправлен', receipt_not_sent: 'Чек не выбит',
    goToPayments: 'Перейти в Платежи', delete: 'Удалить',
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

// ─── Мобильная шторка в стиле TrinityMob ─────────────────────────────────────
function SaleMobSheet({ sale, locale, onClose, onDelete }: {
  sale: Sale; locale: 'he' | 'ru'; onClose: () => void; onDelete: () => void
}) {
  const t = T[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const router = useRouter()
  const sidebarBg = 'var(--trinity-sidebar-bg, #1a2620)'

  const st = STATUS_CONFIG[sale.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new
  const statusLabel = t[`${sale.status}_status` as keyof typeof t] || sale.status
  const methodLabel = t[sale.payment_method as keyof typeof t] || sale.payment_method || t.cash
  const methodIcon  = METHOD_ICON[sale.payment_method || 'cash'] || '💵'
  const total   = Number(sale.total_amount)
  const paid    = Number(sale.paid_amount)
  const balance = Math.max(0, total - paid)
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100
  const clientName = getClientName(sale, t)
  const [g1, g2]   = getGradient(clientName)
  const initials   = getInitials(clientName)

  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startYVal = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerH = useRef(0)

  useEffect(() => {
    document.body.style.overflow    = 'hidden'
    document.body.style.touchAction = 'none'
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = '' }
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function onHandleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startY.current = e.touches[0].clientY
    startYVal.current = y.get()
    if (contentRef.current) drawerH.current = contentRef.current.offsetHeight
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    y.set(Math.max(0, startYVal.current + (e.touches[0].clientY - startY.current)))
  }
  function onHandleTouchEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    if (y.get() > (drawerH.current || 600) * 0.35) {
      animate(y, drawerH.current || 800, { type: 'tween', duration: .25, ease: [.32,.72,0,1], onComplete: onClose })
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div key="sale-mob-overlay" className="fixed inset-0 bg-black/55"
        style={{ opacity: overlayOpacity, zIndex: 9998 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: .2 }} onClick={onClose}
      />
      <motion.div key="sale-mob-sheet" ref={contentRef}
        className="fixed bottom-0 left-0 right-0 flex flex-col outline-none"
        style={{ y, zIndex: 9999, height: 'calc(100dvh - 3rem)', background: sidebarBg,
          borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none', touchAction: 'none', overflow: 'hidden' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        dir={dir}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}>
          <div className="w-10 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg,${g1},${g2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white' }}>
            {initials || <ShoppingBag size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{sale.sale_date} · {t.title}</div>
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px',
          touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as any }}>

          {/* Amount hero */}
          <div style={{ borderRadius: 16, padding: '18px 16px', textAlign: 'center', marginBottom: 12,
            background: `${st.color}18`, border: `1px solid ${st.color}30` }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: st.color, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
              ₪{total.toLocaleString()}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px',
              borderRadius: 20, background: `${st.color}20`, border: `1px solid ${st.color}40` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{String(statusLabel)}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${paidPct}%`, background: `linear-gradient(90deg,${st.barColor}99,${st.barColor})`, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
            <span>{t.paid}: ₪{paid.toLocaleString()}</span><span>{paidPct}%</span>
          </div>

          {/* Balance */}
          {balance > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#fbbf24' }}>{t.balance}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>₪{balance.toLocaleString()}</span>
            </div>
          )}

          {/* Method + Receipt row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{t.method}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{methodIcon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{String(methodLabel)}</span>
              </div>
            </div>
            <div style={{ borderRadius: 12, padding: '10px 12px', background: sale.receipt_sent ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sale.receipt_sent ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{t.receipt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={14} color={sale.receipt_sent ? '#34d399' : 'rgba(255,255,255,0.25)'} />
                <span style={{ fontSize: 11, fontWeight: 600, color: sale.receipt_sent ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
                  {sale.receipt_sent ? t.receipt_sent : t.receipt_not_sent}
                </span>
              </div>
            </div>
          </div>

          {/* Sale items */}
          {sale.sale_items && sale.sale_items.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>{t.items}</div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {sale.sale_items.map((item, idx) => {
                  const isProduct = !!item.product_id
                  const itemTotal = Number(item.total_price || item.quantity * item.unit_price)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isProduct ? 'rgba(217,119,6,0.2)' : 'rgba(124,58,237,0.2)' }}>
                        {isProduct ? <Package size={13} color="#fbbf24" /> : <Wrench size={13} color="#a78bfa" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{item.quantity} × ₪{Number(item.unit_price).toLocaleString()}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>₪{itemTotal.toLocaleString()}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{t.total}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: st.color }}>₪{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 8,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ fontSize: 9, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{t.notes}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{sale.notes}</div>
            </div>
          )}

          {/* ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 2px' }}>
            <Hash size={9} color="rgba(255,255,255,0.2)" />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{sale.id}</span>
          </div>
        </div>

        {/* Sticky action footer */}
        <div style={{ flexShrink: 0, padding: '12px 14px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 8 }}>

          {sale.payment_id && (
            <button onClick={() => { onClose(); router.push('/payments') }}
              style={{ width: '100%', padding: '12px', borderRadius: 13,
                border: '1.5px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)',
                color: '#a5b4fc', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CreditCard size={15} />
              {t.goToPayments}
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onDelete}
              style={{ flex: 1, padding: '12px', borderRadius: 13,
                border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Trash2 size={14} />
              {t.delete}
            </button>
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t.close}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ─── Главный экспорт ──────────────────────────────────────────────────────────
export function SaleDetailModal({ sale, locale, onClose }: Props) {
  const t = T[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const queryClient = useQueryClient()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  if (!sale) return null

  const handleDelete = () => {
    onClose()
    queryClient.invalidateQueries({ queryKey: ['sales'] })
  }

  // ── Мобиль: TrinityMob-стиль ────────────────────────────────────────────────
  if (mounted && isMobile) {
    return (
      <SaleMobSheet
        sale={sale}
        locale={locale}
        onClose={onClose}
        onDelete={handleDelete}
      />
    )
  }

  // ── Данные для десктопа ──────────────────────────────────────────────────────
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

  // ── Десктоп sidebar (без дублирующих кнопок внизу!) ─────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${g1},${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: `0 6px 20px ${g2}55` }}>
          {initials || <ShoppingBag size={22} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: 20 }}>{sale.sale_date}</span>
      </div>
      <div style={{ background: `${st.color}14`, border: `0.5px solid ${st.border}`, borderRadius: 14, padding: '12px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: st.color, letterSpacing: '-1px', lineHeight: 1 }}>₪{total.toLocaleString()}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ color: st.color }}>{st.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{String(statusLabel)}</span>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
        <div style={{ height: '100%', width: `${paidPct}%`, background: `linear-gradient(90deg,${st.barColor}99,${st.barColor})`, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 12 }}>
        <span>{t.paid}: ₪{paid.toLocaleString()}</span>
        <span>{paidPct}%</span>
      </div>
      {balance > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 9, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#fbbf24' }}>{t.balance}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>₪{balance.toLocaleString()}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{methodIcon}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{String(methodLabel)}</span>
      </div>
      {sale.payment_id && (
        <button onClick={() => { onClose(); router.push('/payments') }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.3)', borderRadius: 10, marginBottom: 10, cursor: 'pointer', width: '100%' }}>
          <CreditCard size={13} color="#818cf8" />
          <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 500 }}>{t.goToPayments}</span>
        </button>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
      <AdminDeleteButton type="sale" id={sale.id}
        onDeleted={handleDelete} />
      <button onClick={onClose} style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 6 }}>
        {t.close}
      </button>
    </div>
  )

  // ── Десктоп контент (без footerContent!) ────────────────────────────────────
  return (
    <Modal open={!!sale} onClose={onClose} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={!!sale} onClose={onClose} icon={<ShoppingBag />}
        title={clientName} subtitle={t.title} dir={dir} sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ background: 'linear-gradient(135deg,#f8faff,#eff2ff)', border: '0.5px solid #e0e7ff', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.method}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{methodIcon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{String(methodLabel)}</span>
              </div>
            </div>
            <div style={{ background: sale.receipt_sent ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: `0.5px solid ${sale.receipt_sent ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.receipt}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Receipt size={16} color={sale.receipt_sent ? '#22c55e' : '#cbd5e1'} />
                <span style={{ fontSize: 12, fontWeight: 600, color: sale.receipt_sent ? '#16a34a' : '#94a3b8' }}>
                  {sale.receipt_sent ? t.receipt_sent : t.receipt_not_sent}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          {sale.sale_items && sale.sale_items.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.items}</p>
              <div style={{ border: '0.5px solid #e8edf4', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                {sale.sale_items.map((item, idx) => {
                  const isProduct = !!item.product_id
                  const itemTotal = Number(item.total_price || item.quantity * item.unit_price)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: idx > 0 ? '0.5px solid #f1f5f9' : 'none' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: isProduct ? '#fef3c7' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isProduct ? <Package size={15} color="#d97706" /> : <Wrench size={15} color="#7c3aed" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{item.product_name}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{item.quantity} × ₪{Number(item.unit_price).toLocaleString()}</p>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>₪{itemTotal.toLocaleString()}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'linear-gradient(90deg,#1e293b,#0f172a)', borderTop: '0.5px solid #e8edf4' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.total}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>₪{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '0.5px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.notes}</p>
              <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{sale.notes}</p>
            </div>
          )}

          {/* Sale ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={10} color="#cbd5e1" />
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>{sale.id}</span>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}
