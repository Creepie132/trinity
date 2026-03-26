'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  MessageCircle, FileText, RotateCcw, Receipt,
  CreditCard, Banknote, Smartphone, Building2, CheckCircle2,
  Clock, AlertCircle, Ban, TrendingUp, Loader2,
  Package, Wrench, Hash, CalendarDays, Phone,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { AdminDeletePaymentButton } from './AdminDeletePaymentButton'

interface PaymentDetailsDrawerProps {
  payment: any | null
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  isOwner: boolean
  onRefunded?: () => void
  isSuperAdmin?: boolean
  onDeleted?: () => void
}

const METHOD_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; gradient: string }> = {
  cash:          { icon: <Banknote size={20} />,    color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  bit:           { icon: <Smartphone size={20} />,  color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
  credit_card:   { icon: <CreditCard size={20} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  card:          { icon: <CreditCard size={20} />,  color: '#4f46e5', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '#c7d2fe', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  bank_transfer: { icon: <Building2 size={20} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd', gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  transfer:      { icon: <Building2 size={20} />,   color: '#0284c7', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd', gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; icon: React.ReactNode }> = {
  completed: { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e', icon: <CheckCircle2 size={12} /> },
  paid:      { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  dot: '#22c55e', icon: <CheckCircle2 size={12} /> },
  pending:   { color: '#d97706', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', dot: '#fbbf24', icon: <Clock size={12} /> },
  failed:    { color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  dot: '#ef4444', icon: <AlertCircle size={12} /> },
  refunded:  { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8', icon: <TrendingUp size={12} /> },
  cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', dot: '#94a3b8', icon: <Ban size={12} /> },
}

const STATUS_COLORS_DARK: Record<string, string> = {
  completed: '#34d399', paid: '#34d399', pending: '#fbbf24',
  failed: '#f87171', refunded: '#818cf8', cancelled: '#94a3b8',
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// ─── Мобильная шторка в стиле TrinityMob ─────────────────────────────────────
function PaymentMobSheet({
  payment, onClose, locale,
  isOwner, isSuperAdmin, onRefunded, onDeleted,
  refunding, sendingReceipt, downloadingPdf,
  handleWhatsApp, handleDownloadPdf, handleRefund,
  l, mc, sc, methodLabel, statusLabel, method, clientName, formattedDate,
  formattedTime, formattedFull, clientPhone, typeLabel, tranzilaId,
  saleItems, saleId, saleNotes, loadingDetails,
}: any) {
  const sidebarBg  = 'var(--trinity-sidebar-bg, #1a2620)'
  const accentText = 'var(--trinity-accent-text, #74c69d)'
  const accentBg   = 'var(--trinity-accent-bg, rgba(45,106,79,0.27))'

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
    return () => {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
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
    const delta = e.touches[0].clientY - startY.current
    y.set(Math.max(0, startYVal.current + delta))
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

  const initials = getInitials(clientName)
  const isHe = locale === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  const statusDotColor = STATUS_COLORS_DARK[payment.status] || '#94a3b8'

  return createPortal(
    <AnimatePresence>
      <motion.div key="pay-mob-overlay" className="fixed inset-0 bg-black/55"
        style={{ opacity: overlayOpacity, zIndex: 9998 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: .2 }} onClick={onClose}
      />
      <motion.div key="pay-mob-sheet" ref={contentRef}
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
          onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Icon avatar */}
          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: mc.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', boxShadow: `0 4px 12px ${mc.color}44` }}>
            {initials || <Receipt size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{formattedFull}</span>
            </div>
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

          {/* Amount hero — dark style */}
          <div style={{ borderRadius: 16, padding: '18px 16px', textAlign: 'center', marginBottom: 12,
            background: `${statusDotColor}18`, border: `1px solid ${statusDotColor}30` }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: statusDotColor, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
              ₪{Number(payment.amount).toFixed(2)}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px',
              borderRadius: 20, background: `${statusDotColor}20`, border: `1px solid ${statusDotColor}40` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDotColor }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: statusDotColor, letterSpacing: '0.05em' }}>
                {statusLabel[payment.status] || payment.status}
              </span>
            </div>
          </div>

          {/* Date + Method grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{l.purchaseDate}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <CalendarDays size={12} color="rgba(255,255,255,0.45)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{formattedDate}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{formattedTime}</span>
              </div>
            </div>
            <div style={{ borderRadius: 12, padding: '10px 12px', background: `${mc.color}14`, border: `1px solid ${mc.color}30` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{l.method}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: mc.color, display: 'flex' }}>{mc.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{methodLabel[method] || method}</span>
              </div>
            </div>
          </div>

          {/* Type */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 12px', borderRadius: 10, marginBottom: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{l.type}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{typeLabel}</span>
          </div>

          {/* Phone */}
          {clientPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', borderRadius: 10, marginBottom: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={12} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{l.phone}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'white', fontFamily: 'monospace' }} dir="ltr">{clientPhone}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {loadingDetails && (
            <div style={{ borderRadius: 12, padding: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Loader2 size={18} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* Sale items */}
          {!loadingDetails && saleItems.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>{l.items}</div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {saleItems.map((item: any, idx: number) => {
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
                {/* Total row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{l.total}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: statusDotColor }}>₪{Number(payment.amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {(saleNotes || payment.description) && (
            <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 8,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ fontSize: 9, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{saleNotes ? l.notes : l.description}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{saleNotes || payment.description}</div>
            </div>
          )}

          {/* IDs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {tranzilaId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{l.tranzilaId}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{tranzilaId}</span>
              </div>
            )}
            {saleId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{l.saleId}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{saleId.slice(0, 16)}…</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 2px' }}>
              <Hash size={9} color="rgba(255,255,255,0.2)" />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{payment.id?.slice(0, 16)}…</span>
            </div>
          </div>
        </div>

        {/* Sticky action footer — стиль TrinityMob */}
        <div style={{ flexShrink: 0, padding: '12px 14px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 8 }}>

          {clientPhone && (
            <button onClick={handleWhatsApp} disabled={sendingReceipt}
              style={{ width: '100%', padding: '13px', borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: sendingReceipt ? 0.6 : 1, boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}>
              {sendingReceipt ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={16} />}
              {l.sendWhatsapp}
            </button>
          )}

          {payment.status === 'completed' && (
            <button onClick={handleDownloadPdf} disabled={downloadingPdf}
              style={{ width: '100%', padding: '12px', borderRadius: 13,
                border: '1.5px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.12)',
                color: '#93c5fd', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: downloadingPdf ? 0.6 : 1 }}>
              {downloadingPdf ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
              {l.downloadPdf}
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {isOwner && payment.status === 'completed' && (
              <button onClick={handleRefund} disabled={refunding}
                style={{ flex: 1, padding: '12px', borderRadius: 13,
                  border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                  color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {refunding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
                {l.refund}
              </button>
            )}
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {l.close}
            </button>
          </div>

          {isSuperAdmin && (
            <AdminDeletePaymentButton paymentId={payment.id} variant="sidebar"
              onDeleted={() => { onDeleted?.(); onClose() }} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ─── Главный экспорт ──────────────────────────────────────────────────────────
export function PaymentDetailsDrawer({
  payment: initialPayment, isOpen, onClose, locale,
  isOwner, onRefunded, isSuperAdmin, onDeleted,
}: PaymentDetailsDrawerProps) {
  const [refunding, setRefunding]       = useState(false)
  const [sendingReceipt, setSending]    = useState(false)
  const [downloadingPdf, setDownloading] = useState(false)
  const [richPayment, setRichPayment]   = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [mounted, setMounted]           = useState(false)
  const [isMobile, setIsMobile]         = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (!isOpen || !initialPayment?.id) { setRichPayment(null); return }
    setLoadingDetails(true)
    fetch(`/api/payments/${initialPayment.id}`)
      .then(r => r.json())
      .then(d => setRichPayment(d.payment || null))
      .catch(() => setRichPayment(null))
      .finally(() => setLoadingDetails(false))
  }, [isOpen, initialPayment?.id])

  const payment = richPayment ? { ...initialPayment, ...richPayment } : initialPayment

  const isHe = locale === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  const L = {
    he: {
      method: 'אמצעי תשלום', status: 'סטטוס', date: 'תאריך', time: 'שעה',
      tranzilaId: 'מזהה Tranzila', internalId: 'מזהה פנימי', type: 'סוג',
      sendWhatsapp: 'שלח קבלה ב-WhatsApp', downloadPdf: 'הורד PDF (Tranzila)',
      refund: 'בצע החזר', refundConfirm: 'אשר החזר?',
      refundSuccess: 'ההחזר בוצע', refundError: 'שגיאה בהחזר',
      receiptSent: 'קבלה נשלחה!', receiptError: 'שגיאה בשליחת קבלה',
      paid: 'שולם', pending: 'ממתין', failed: 'נכשל', refunded: 'הוחזר', cancelled: 'בוטל',
      cash: 'מזומן', credit_card: 'כרטיס', bank_transfer: 'העברה', bit: 'ביט',
      service: 'שירות', product: 'מוצר', subscription: 'מנוי',
      noPhone: 'אין מספר טלפון', close: 'סגור', description: 'תיאור', phone: 'טלפון',
      items: 'פריטים', total: 'סה״כ', saleId: 'מספר עסקה', qty: 'כמות',
      notes: 'הערות', purchaseDate: 'תאריך רכישה',
    },
    ru: {
      method: 'Способ оплаты', status: 'Статус', date: 'Дата', time: 'Время',
      tranzilaId: 'Tranzila ID', internalId: 'Внутренний ID', type: 'Тип',
      sendWhatsapp: 'Отправить квитанцию WA', downloadPdf: 'Скачать PDF (Tranzila)',
      refund: 'Возврат', refundConfirm: 'Подтвердить возврат?',
      refundSuccess: 'Возврат выполнен', refundError: 'Ошибка возврата',
      receiptSent: 'Квитанция отправлена!', receiptError: 'Ошибка отправки',
      paid: 'Оплачено', pending: 'Ожидает', failed: 'Ошибка', refunded: 'Возвращено', cancelled: 'Отменён',
      cash: 'Наличные', credit_card: 'Карта', bank_transfer: 'Перевод', bit: 'Bit',
      service: 'Услуга', product: 'Товар', subscription: 'Абонемент',
      noPhone: 'Нет телефона', close: 'Закрыть', description: 'Описание', phone: 'Телефон',
      items: 'Позиции', total: 'Итого', saleId: 'Номер сделки', qty: 'Кол-во',
      notes: 'Примечания', purchaseDate: 'Дата покупки',
    },
  }
  const l = L[locale]

  if (!payment) return null

  const clientName  = payment.client_name
    || (payment.clients ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() : null)
    || '—'
  const clientPhone = payment.clients?.phone || payment.client_phone || ''
  const paymentDate = payment.paid_at || payment.created_at
  const dateObj     = paymentDate ? new Date(paymentDate) : null
  const formattedDate = dateObj ? format(dateObj, 'dd/MM/yyyy') : '—'
  const formattedTime = dateObj ? format(dateObj, 'HH:mm') : '—'
  const formattedFull = dateObj ? format(dateObj, 'dd/MM/yyyy HH:mm') : '—'

  const method  = payment.payment_method || 'cash'
  const mc      = METHOD_CONFIG[method] || { icon: <Receipt size={20} />, color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '#e2e8f0', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)' }
  const sc      = STATUS_CONFIG[payment.status] || STATUS_CONFIG.cancelled
  const methodLabel: Record<string, string> = { cash: l.cash, credit_card: l.credit_card, card: l.credit_card, bank_transfer: l.bank_transfer, bit: l.bit, transfer: l.bank_transfer }
  const statusLabel: Record<string, string> = { completed: l.paid, paid: l.paid, pending: l.pending, failed: l.failed, refunded: l.refunded, cancelled: l.cancelled }
  const tranzilaId  = payment.transaction_id || payment.metadata?.tranzila_transaction_id || payment.metadata?.transaction_id || null
  const typeLabel   = payment.subscription_period_start ? l.subscription : payment.type === 'product' ? l.product : l.service
  const saleItems: any[] = payment.sales?.sale_items ?? []
  const saleId    = payment.sales?.id ?? null
  const saleNotes = payment.sales?.notes ?? payment.description ?? null

  // Общие обработчики
  const handleWhatsApp = async () => {
    if (!clientPhone) { toast.error(l.noPhone); return }
    setSending(true)
    try {
      const res  = await fetch(`/api/payments/${payment.id}/send-receipt`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(l.receiptSent)
    } catch (e: any) { toast.error(`${l.receiptError}: ${e.message}`) }
    finally { setSending(false) }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      if (!payment.tranzila_document_id) {
        const res  = await fetch(`/api/payments/${payment.id}/send-receipt`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create receipt')
      }
      window.open(`/api/payments/${payment.id}/tranzila-pdf`, '_blank')
    } catch (e: any) { toast.error(`${l.receiptError}: ${e.message}`) }
    finally { setDownloading(false) }
  }

  const handleRefund = async () => {
    if (!confirm(l.refundConfirm)) return
    setRefunding(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}/refund`, { method: 'POST' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Refund failed') }
      toast.success(l.refundSuccess)
      onRefunded?.()
      onClose()
    } catch (e: any) { toast.error(`${l.refundError}: ${e.message}`) }
    finally { setRefunding(false) }
  }

  const sharedProps = {
    payment, onClose, locale, isOwner, isSuperAdmin, onRefunded, onDeleted,
    refunding, sendingReceipt, downloadingPdf,
    handleWhatsApp, handleDownloadPdf, handleRefund,
    l, mc, sc, methodLabel, statusLabel, method, clientName,
    formattedDate, formattedTime, formattedFull,
    clientPhone, typeLabel, tranzilaId,
    saleItems, saleId, saleNotes, loadingDetails,
  }

  // ── Мобиль: TrinityMob-стиль портал ────────────────────────────────────────
  if (mounted && isMobile) {
    if (!isOpen) return null
    return <PaymentMobSheet {...sharedProps} />
  }

  // ── Десктоп: sidebar grid layout (кнопки только в сайдбаре!) ───────────────
  const initials = getInitials(clientName)

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: mc.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900, boxShadow: `0 6px 20px ${mc.color}44` }}>
          {initials || <Receipt size={22} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20 }}>{formattedFull}</span>
      </div>
      <div style={{ background: sc.bg, border: `0.5px solid ${sc.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: sc.color, letterSpacing: '-1px', lineHeight: 1 }}>₪{Number(payment.amount).toFixed(2)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
          <span style={{ color: sc.color }}>{sc.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusLabel[payment.status] || payment.status}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ color: mc.color }}>{mc.icon}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{methodLabel[method] || method}</span>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
      {clientPhone && (
        <button onClick={handleWhatsApp} disabled={sendingReceipt}
          style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: sendingReceipt ? 0.6 : 1 }}>
          {sendingReceipt ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={13} />}
          {l.sendWhatsapp}
        </button>
      )}
      {payment.status === 'completed' && (
        <button onClick={handleDownloadPdf} disabled={downloadingPdf}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: downloadingPdf ? 0.6 : 1 }}>
          {downloadingPdf ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
          {l.downloadPdf}
        </button>
      )}
      {isOwner && payment.status === 'completed' && (
        <button onClick={handleRefund} disabled={refunding}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {refunding ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={13} />}
          {l.refund}
        </button>
      )}
      {isSuperAdmin && (
        <div style={{ marginBottom: 5 }}>
          <AdminDeletePaymentButton paymentId={payment.id} variant="sidebar" onDeleted={() => { onDeleted?.(); onClose() }} />
        </div>
      )}
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
        {l.close}
      </button>
    </div>
  )

  // Десктоп — контент (без footerContent!)
  const content = (
    <div style={{ padding: '20px 18px 24px' }} className="space-y-4">
      <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 16, padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: sc.color, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
          ₪{Number(payment.amount).toFixed(2)}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: `${sc.dot}20`, border: `1px solid ${sc.dot}40` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, letterSpacing: '0.05em' }}>{statusLabel[payment.status] || payment.status}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{l.purchaseDate}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <CalendarDays size={15} color="#94a3b8" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={13} color="#94a3b8" />
            <span style={{ fontSize: 12, color: '#64748b' }}>{formattedTime}</span>
          </div>
        </div>
        <div style={{ background: mc.bg, border: `1px solid ${mc.border}`, borderRadius: 14, padding: '12px 14px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: mc.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{l.method}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: mc.color }}>{mc.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{methodLabel[method] || method}</span>
          </div>
        </div>
      </div>
      <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.type}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{typeLabel}</span>
      </div>
      {clientPhone && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} color="#94a3b8" /><span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{l.phone}</span></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: 'monospace' }} dir="ltr">{clientPhone}</span>
        </div>
      )}
      {loadingDetails && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'center' }}><Loader2 size={18} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} /></div>}
      {!loadingDetails && saleItems.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{l.items}</p>
          <div style={{ border: '0.5px solid #e8edf4', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
            {saleItems.map((item: any, idx: number) => {
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
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.total}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>₪{Number(payment.amount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      {(saleNotes || payment.description) && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{saleNotes ? l.notes : l.description}</p>
          <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>{saleNotes || payment.description}</p>
        </div>
      )}
      <div className="space-y-2">
        {tranzilaId && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{l.tranzilaId}</span><span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{tranzilaId}</span></div>}
        {saleId && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{l.saleId}</span><span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{saleId.slice(0, 16)}…</span></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Hash size={10} color="#cbd5e1" /><span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{l.internalId}:</span><span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>{payment.id?.slice(0, 16)}…</span></div>
      </div>
    </div>
  )

  return (
    <Modal open={isOpen} onClose={onClose} darkHeader showCloseButton={false} width="700px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={isOpen} onClose={onClose} icon={<Receipt />}
        title={clientName} subtitle={formattedFull} dir={dir} sidebarExtra={sidebar}>
        {content}
      </TrinityModalShell>
    </Modal>
  )
}
