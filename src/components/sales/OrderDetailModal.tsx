'use client'
/**
 * OrderDetailModal — детали заказа с сайта.
 * Десктоп: TrinityModalShell
 * Мобайл:  TrinityMob dark drawer со swipe
 * Кнопка «Оформить» → UnifiedSalesDialog с предзаполненными данными
 * Если клиент не найден → предложение добавить
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { UnifiedSalesDialog } from '@/components/sales/UnifiedSalesDialog'
import { useSiteOrder, SiteOrder } from '@/hooks/useSiteOrders'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import {
  ShoppingBag, Phone, Mail, MessageCircle, X,
  Package, ChevronLeft, ChevronRight, UserPlus,
  CheckCircle2, Clock, XCircle, Loader2, User,
} from 'lucide-react'

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  ru: {
    title: 'Заказ с сайта', from: 'от', close: 'Закрыть',
    customer: 'Покупатель', phone: 'Телефон', email: 'Email',
    items: 'Товары', notes: 'Комментарий', source: 'Источник',
    total: 'Итого', status: 'Статус', created: 'Дата',
    process: 'Оформить сделку', cancel: 'Отменить',
    clientFound: 'Клиент найден в базе', clientNotFound: 'Клиент не в базе',
    addClient: 'Добавить в CRM', page: 'стр.', prev: '← Пред', next: 'След →',
    statuses: { new: 'Новый', processing: 'В обработке', completed: 'Оформлен', cancelled: 'Отменён' },
    loading: 'Загрузка...', noItems: 'Нет товаров',
    whatsapp: 'WhatsApp',
  },
  he: {
    title: 'הזמנה מהאתר', from: 'מ-', close: 'סגור',
    customer: 'לקוח', phone: 'טלפון', email: 'אימייל',
    items: 'פריטים', notes: 'הערה', source: 'מקור',
    total: 'סה״כ', status: 'סטטוס', created: 'תאריך',
    process: 'פתח עסקה', cancel: 'בטל',
    clientFound: 'לקוח קיים במערכת', clientNotFound: 'לקוח לא נמצא',
    addClient: 'הוסף ל-CRM', page: 'עמ׳', prev: '→ הקודם', next: 'הבא ←',
    statuses: { new: 'חדש', processing: 'בטיפול', completed: 'הושלם', cancelled: 'בוטל' },
    loading: 'טוען...', noItems: 'אין פריטים',
    whatsapp: 'WhatsApp',
  },
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  new:        { icon: Clock,        color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  processing: { icon: Loader2,      color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  completed:  { icon: CheckCircle2, color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  cancelled:  { icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50 border-red-200' },
}

interface OrderDetailModalProps {
  orderId: string | null
  open: boolean
  onClose: () => void
}

// ─── Items pager (up to 10 per page) ─────────────────────────────────────────
function ItemsPager({ order, t, isHe }: { order: SiteOrder; t: typeof T['ru']; isHe: boolean }) {
  const PAGE = 10
  const [page, setPage] = useState(0)
  const items = order.items || []
  const total = items.length
  const pages = Math.ceil(total / PAGE) || 1
  const slice = items.slice(page * PAGE, (page + 1) * PAGE)

  return (
    <div>
      <div className="space-y-2">
        {slice.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.product_name}</p>
              <p className="text-xs text-gray-400">{item.quantity} × ₪{item.unit_price}</p>
            </div>
            <span className="text-sm font-bold text-gray-700 flex-shrink-0">₪{(item.quantity * item.unit_price).toFixed(0)}</span>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            {isHe ? <ChevronRight size={13}/> : <ChevronLeft size={13}/>}{t.prev}
          </button>
          <span className="text-xs text-gray-400">{t.page} {page + 1} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            {t.next}{isHe ? <ChevronLeft size={13}/> : <ChevronRight size={13}/>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function OrderDetailModal({ orderId, open, onClose }: OrderDetailModalProps) {
  const { language } = useLanguage()
  const isHe = language === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'
  const t    = T[isHe ? 'he' : 'ru']
  const { openModal } = useModalStore()
  const queryClient   = useQueryClient()

  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [saleOpen, setSaleOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    fn(); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn)
  }, [])

  const { data: order, isLoading } = useSiteOrder(open ? orderId : null)

  if (!mounted || !open) return null

  const statusCfg = STATUS_CFG[order?.status ?? 'new']
  const StatusIcon = statusCfg.icon

  // ── Открыть UnifiedSalesDialog с данными заказа ──────────────────────────
  const handleProcess = () => {
    if (!order) return
    const clientId   = order.matched_client?.id
    const clientName = order.matched_client
      ? `${order.matched_client.first_name} ${order.matched_client.last_name}`.trim()
      : undefined

    setSaleOpen(true)
    // Помечаем заказ как в обработке
    apiFetch(`/api/site-orders/${order.id}`, { method: 'PATCH', json: { status: 'processing' } })
      .then(() => queryClient.invalidateQueries({ queryKey: ['site-orders'] }))
      .catch(() => {})
  }

  // ── После успешного создания сделки — линкуем заказ ─────────────────────
  const handleSaleSuccess = () => {
    if (!order) return
    queryClient.invalidateQueries({ queryKey: ['site-orders'] })
    queryClient.invalidateQueries({ queryKey: ['site-order', orderId] })
  }

  // ── Добавить клиента ─────────────────────────────────────────────────────
  const handleAddClient = () => {
    if (!order) return
    onClose()
    openModal('client-add', {
      prefill: {
        first_name: order.customer_name.split(' ')[0] ?? order.customer_name,
        last_name:  order.customer_name.split(' ').slice(1).join(' ') ?? '',
        phone:      order.customer_phone ?? '',
        email:      order.customer_email ?? '',
      },
    })
  }

  // ── Данные для UnifiedSalesDialog ────────────────────────────────────────
  const saleInitialData = order ? {
    clientId:       order.matched_client?.id,
    clientName:     order.matched_client
      ? `${order.matched_client.first_name} ${order.matched_client.last_name}`.trim()
      : undefined,
    preloadedItems: (order.items || []).map(i => ({
      id:    i.product_id,
      name:  i.product_name,
      price: i.unit_price,
    })),
    onSuccess: handleSaleSuccess,
  } : undefined

  const phone = order?.customer_phone
  const waPhone = phone ? phone.replace(/\D/g, '') : null

  // ── Body content ─────────────────────────────────────────────────────────
  const bodyContent = isLoading ? (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
    </div>
  ) : order ? (
    <div className="px-5 py-5 space-y-5" dir={dir}>

      {/* Статус + дата */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
          <StatusIcon size={13} className={order.status === 'processing' ? 'animate-spin' : ''} />
          {t.statuses[order.status]}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(order.created_at).toLocaleString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-xs text-gray-300">· {order.source}</span>
      </div>

      {/* Покупатель */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.customer}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {order.customer_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{order.customer_name}</p>
            {order.customer_email && <p className="text-xs text-gray-400">{order.customer_email}</p>}
          </div>
        </div>
        {/* Действия со связью */}
        {(phone || order.customer_email) && (
          <div className="flex gap-2 flex-wrap">
            {phone && (
              <a href={`tel:${phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
                <Phone size={12}/>{phone}
              </a>
            )}
            {waPhone && (
              <a href={`https://wa.me/972${waPhone.replace(/^0/, '')}` } target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs font-semibold hover:bg-green-100 transition">
                <MessageCircle size={12}/>{t.whatsapp}
              </a>
            )}
            {order.customer_email && (
              <a href={`mailto:${order.customer_email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-100 transition">
                <Mail size={12}/>{t.email}
              </a>
            )}
          </div>
        )}
        {/* CRM match */}
        {order.matched_client ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <User size={13} className="text-emerald-600 flex-shrink-0"/>
            <span className="text-xs font-semibold text-emerald-700">{t.clientFound}: {order.matched_client.first_name} {order.matched_client.last_name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xs font-semibold text-amber-700">{t.clientNotFound}</span>
            <button onClick={handleAddClient}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition">
              <UserPlus size={11}/>{t.addClient}
            </button>
          </div>
        )}
      </div>

      {/* Товары */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.items}</p>
        <ItemsPager order={order} t={t} isHe={isHe} />
      </div>

      {/* Итог */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-800 rounded-xl">
        <span className="text-xs font-semibold text-white/60 uppercase">{t.total}</span>
        <span className="text-xl font-black text-white">₪{Number(order.total_amount).toFixed(0)}</span>
      </div>

      {/* Комментарий */}
      {order.notes && (
        <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.notes}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  ) : null

  // ── Кнопки футера ────────────────────────────────────────────────────────
  const footerContent = order && order.status !== 'completed' && order.status !== 'cancelled' ? (
    <button onClick={handleProcess} disabled={!order}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
      <ShoppingBag size={16}/>{t.process}
    </button>
  ) : null

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        <Modal open={open} onClose={onClose} darkHeader showCloseButton={false} width="600px" dir={dir} contentClassName="!p-0">
          <TrinityModalShell open={open} onClose={onClose}
            icon={<ShoppingBag />}
            title={t.title}
            subtitle={order?.customer_name || ''}
            dir={dir}
            footerContent={footerContent}
            sidebarExtra={order ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(245,158,11,0.35)' }}>
                    <ShoppingBag size={20} color="#fff" />
                  </div>
                </div>
                <div style={{ background:'rgba(52,211,153,0.12)', border:'0.5px solid rgba(52,211,153,0.25)', borderRadius:12, padding:'10px 8px', textAlign:'center', marginBottom:8 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:'#34d399' }}>₪{Number(order.total_amount).toFixed(0)}</div>
                  <div style={{ fontSize:9, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{t.total}</div>
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', textAlign:'center', marginBottom:4 }}>{order.items?.length || 0} поз.</div>
                <div style={{ height:'0.5px', background:'rgba(255,255,255,0.08)', margin:'0 0 8px' }}/>
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button onClick={handleProcess}
                    style={{ padding:'11px 14px', borderRadius:10, border:'none', cursor:'pointer', width:'100%', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:6 }}>
                    <ShoppingBag size={14}/>{t.process}
                  </button>
                )}
                <button onClick={onClose} style={{ padding:'8px 14px', borderRadius:9, border:'0.5px solid rgba(255,255,255,0.12)', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer' }}>
                  {t.close}
                </button>
              </div>
            ) : null}>
            {bodyContent}
          </TrinityModalShell>
        </Modal>

        {saleOpen && saleInitialData && (
          <UnifiedSalesDialog open={saleOpen} onOpenChange={v => { if (!v) setSaleOpen(false) }} initialData={saleInitialData} />
        )}
      </>
    )
  }

  // ── MOBILE DRAWER ────────────────────────────────────────────────────────
  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="order-overlay" className="fixed inset-0 bg-black/50"
              style={{ zIndex: 9998 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: .2 }} onClick={onClose} />
            <motion.div key="order-drawer"
              className="fixed bottom-0 left-0 right-0 flex flex-col"
              style={{ zIndex: 9999, height: 'calc(100dvh - 3rem)', background: '#1a2333', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', overflow: 'hidden' }}
              dir={dir}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}>

              {/* Ручка */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ShoppingBag size={18} color="#fff"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{t.title}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{order?.customer_name || ''}</div>
                </div>
                {order && (
                  <div style={{ textAlign:'center', background:'rgba(52,211,153,0.12)', border:'0.5px solid rgba(52,211,153,0.3)', borderRadius:10, padding:'4px 10px' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#34d399' }}>₪{Number(order.total_amount).toFixed(0)}</div>
                  </div>
                )}
                <button onClick={onClose} style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto" style={{ background:'#fff' }}>
                {bodyContent}
              </div>
              {/* Footer */}
              {footerContent && (
                <div style={{ flexShrink:0, display:'flex', gap:8, padding:'12px 16px', background:'#fff', borderTop:'1px solid #f1f5f9' }}>
                  {footerContent}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {saleOpen && saleInitialData && (
        <UnifiedSalesDialog open={saleOpen} onOpenChange={v => { if (!v) setSaleOpen(false) }} initialData={saleInitialData} />
      )}
    </>,
    document.body
  )
}
