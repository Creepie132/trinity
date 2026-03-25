'use client'

/**
 * VisitDetailMob — мобильная карточка визита в стиле TrinityMob.
 *
 * Структура:
 *   Portal → overlay + bottom drawer
 *     ├─ Ручка + Header (аватар, имя клиента, ×)
 *     └─ SwipeZone
 *          ├─ MainPanel   (статус, услуги, заметки, история)
 *          └─ ActionDrawer (шторка: действия по визиту)
 *
 * Свайп:
 *   - LTR (RU): свайп влево  → открыть шторку
 *   - RTL (HE): свайп вправо → открыть шторку
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Phone, MessageCircle, MessageSquare,
  Scissors, Package, Play, CheckCircle, X, Pencil,
  Calendar, Clock, FileText, History, MapPin, Video,
  ExternalLink, Navigation, ChevronRight, Plus, Loader2, Search,
} from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useVisitServices, useRemoveVisitService, useAddVisitService } from '@/hooks/useVisitServices'
import { useServices } from '@/hooks/useServices'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Типы ──────────────────────────────────────────────────────────────────────

export interface VisitDetailMobProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clientName: string
  clientPhone?: string
  serviceName?: string
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
  onEdit: () => void
  lastVisitDate?: string
  onShowHistory?: () => void
}

// ─── Статусы ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { ru: string; he: string; color: string; bg: string }> = {
  scheduled:   { ru: 'Запланирован', he: 'מתוכנן',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
  in_progress: { ru: 'В процессе',   he: 'בתהליך',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  },
  completed:   { ru: 'Завершён',     he: 'הושלם',   color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  cancelled:   { ru: 'Отменён',      he: 'בוטל',    color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  no_show:     { ru: 'Не пришёл',    he: 'לא הגיע', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

const AVATAR_COLORS: Record<string, [string, string]> = {
  scheduled:   ['#60a5fa', '#38bdf8'],
  in_progress: ['#fbbf24', '#f97316'],
  completed:   ['#34d399', '#0d9488'],
  cancelled:   ['#94a3b8', '#64748b'],
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ─── ActionRow ────────────────────────────────────────────────────────────────

function ActionRow({ icon, label, onClick, danger = false, iconBg, iconColor }: {
  icon: React.ReactNode; label: string; onClick?: () => void
  danger?: boolean; iconBg?: string; iconColor?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
      borderRadius: 11, width: '100%',
      border: danger ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(255,255,255,0.08)',
      background: 'transparent', cursor: 'pointer',
      color: danger ? '#f87171' : 'white', fontSize: 12, fontWeight: 500,
      transition: 'opacity .15s',
    }}
    onTouchStart={e => { (e.currentTarget as HTMLElement).style.opacity = '.7' }}
    onTouchEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? 'rgba(239,68,68,0.14)' : (iconBg ?? 'rgba(255,255,255,0.07)'),
        color: danger ? '#f87171' : (iconColor ?? 'rgba(255,255,255,0.7)'),
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, textAlign: 'start' }}>{label}</span>
      <span style={{ color: danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)', fontSize: 13 }}>›</span>
    </button>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function VisitDetailMob({
  visit, isOpen, onClose, locale, clientName, clientPhone,
  serviceName, onStart, onComplete, onCancel, onEdit,
  lastVisitDate, onShowHistory,
}: VisitDetailMobProps) {
  const isHe = locale === 'he'
  const isRtl = isHe
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const queryClient = useQueryClient()
  const { openModal } = useModalStore()

  const { data: visitServicesFromHook } = useVisitServices(visit?.id || '')
  const visitServices = visitServicesFromHook ?? visit?.visit_services ?? []
  const removeVisitService = useRemoveVisitService(visit?.id || '')
  const addVisitService = useAddVisitService(visit?.id || '')
  const { data: allServices = [] } = useServices()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [serviceSearch, setServiceSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Framer motion — drag-to-close
  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startYVal = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerH = useRef(0)

  // Горизонтальный свайп
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  useEffect(() => {
    if (isOpen) { y.set(0); document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, y])

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && handleClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen])

  function handleClose() {
    setDrawerOpen(false)
    onClose()
  }

  // Вертикальный drag-to-close
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
    if (y.get() > drawerH.current * 0.35) {
      animate(y, drawerH.current || 600, { type: 'tween', duration: .25, ease: [.32,.72,0,1], onComplete: handleClose })
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  // Горизонтальный свайп
  function onContentTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onContentTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > Math.abs(dx) || Math.abs(dx) < 40) return
    if (!drawerOpen) {
      if (isRtl && dx > 50)  setDrawerOpen(true)
      if (!isRtl && dx < -50) setDrawerOpen(true)
    } else {
      if (isRtl && dx < -50)  { setDrawerOpen(false) }
      if (!isRtl && dx > 50)  { setDrawerOpen(false) }
    }
  }

  if (!mounted || !visit) return null

  const statusCfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.cancelled
  const statusLabel = isHe ? statusCfg.he : statusCfg.ru
  const [g1, g2] = AVATAR_COLORS[visit.status] || AVATAR_COLORS.cancelled

  const date = new Date(visit.scheduled_at)
  const locStr = isHe ? 'he-IL' : 'ru-RU'
  const timeStr = date.toLocaleTimeString(locStr, { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString(locStr, { day: 'numeric', month: 'long' })

  const displayServiceName = visit.services
    ? (isHe ? visit.services.name : (visit.services.name_ru || visit.services.name))
    : serviceName

  const totalPrice = (visit.price || 0) + visitServices.reduce((s: number, vs: any) => s + (vs.price || 0), 0)

  const sidebarBg   = 'var(--trinity-sidebar-bg, #1a2620)'
  const accentColor = 'var(--trinity-accent, #2d6a4f)'
  const accentText  = 'var(--trinity-accent-text, #74c69d)'
  const accentBg    = 'var(--trinity-accent-bg, rgba(45,106,79,0.27))'
  const drawerBg    = 'color-mix(in srgb, var(--trinity-sidebar-bg, #1a2620) 80%, black)'

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="vd-overlay"
            className="fixed inset-0"
            style={{ opacity: overlayOpacity, zIndex: 9998, background: 'rgba(0,0,0,0.55)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: .2 }}
            onClick={handleClose}
          />

          {/* Bottom drawer */}
          <motion.div
            key="vd-drawer"
            ref={contentRef}
            className="fixed bottom-0 left-0 right-0 flex flex-col outline-none"
            style={{
              y, zIndex: 9999,
              height: 'calc(100dvh - 3rem)',
              background: sidebarBg,
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              touchAction: 'none',
              overflow: 'hidden',
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Ручка */}
            <div
              className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab select-none"
              style={{ touchAction: 'none' }}
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="w-10 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white',
              }}>{getInitials(clientName)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>
                  {displayServiceName || (isHe ? 'פרטי ביקור' : 'Детали визита')}
                </div>
              </div>
              {/* Быстрая кнопка Начать / Завершить прямо в header */}
              {visit.status === 'scheduled' && (
                <button onClick={() => { onStart(); handleClose() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'rgba(52,211,153,0.18)', color: '#34d399', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  <Play size={11} className="fill-current" />{isHe ? 'התחל' : 'Начать'}
                </button>
              )}
              {visit.status === 'in_progress' && (
                <button onClick={() => { onComplete(); handleClose() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'rgba(52,211,153,0.18)', color: '#34d399', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  <CheckCircle size={11} />{isHe ? 'סיים' : 'Завершить'}
                </button>
              )}
              <button onClick={handleClose}
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                ✕
              </button>
            </div>

            {/* Swipe zone */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
              onTouchStart={onContentTouchStart}
              onTouchEnd={onContentTouchEnd}>

              {/* ── MAIN PANEL ── */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                overflowY: 'auto', padding: '14px 14px 24px',
                display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                transform: drawerOpen ? (isRtl ? 'translateX(74%)' : 'translateX(-74%)') : 'translateX(0)',
                touchAction: 'pan-y',
              }}>

                {/* Swipe hint — покачивается каждые 3-4 сек */}
                <motion.button
                  onClick={() => setDrawerOpen(true)}
                  animate={drawerOpen ? {} : {
                    x: isRtl
                      ? [0, 5, -4, 3, -2, 0]
                      : [0, -5, 4, -3, 2, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 3.2,
                    ease: 'easeInOut',
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    alignSelf: 'center', padding: '5px 11px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer',
                  }}
                >
                  {isRtl
                    ? <><span>›</span><span>החלק ימינה — פעולות</span><span>‹</span></>
                    : <><span>‹</span><span>← Свайп влево — действия →</span><span>›</span></>}
                </motion.button>

                {/* Статус + время/дата */}
                {(() => {
                  const isInProgress = visit.status === 'in_progress'
                  const startedAtStr = (isInProgress && visit.started_at)
                    ? new Date(visit.started_at).toLocaleTimeString(locStr, { hour: '2-digit', minute: '2-digit' })
                    : null
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: startedAtStr ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
                      <div style={{ borderRadius: 11, padding: '9px 6px', textAlign: 'center', background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color, margin: '0 auto 4px' }} />
                        <div style={{ fontSize: 9, fontWeight: 600, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{statusLabel}</div>
                      </div>
                      <div style={{ borderRadius: 11, padding: '9px 6px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{timeStr}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{isHe ? 'שעה' : 'Время'}</div>
                      </div>
                      {/* Фактическое начало — только для in_progress */}
                      {startedAtStr && (
                        <div style={{ borderRadius: 11, padding: '9px 6px', textAlign: 'center', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>▶ {startedAtStr}</div>
                          <div style={{ fontSize: 9, color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{isHe ? 'התחלה' : 'Начало'}</div>
                        </div>
                      )}
                      <div style={{ borderRadius: 11, padding: '9px 6px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{dateStr}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{isHe ? 'תאריך' : 'Дата'}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Услуги */}
                {(displayServiceName || visitServices.length > 0) && (
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                      {isHe ? 'שירותים' : 'Услуги'}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 11, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      {displayServiceName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Scissors size={12} color="#60a5fa" />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{displayServiceName}</span>
                          {visit.price ? <span style={{ fontSize: 12, fontWeight: 700, color: accentText }}>₪{visit.price}</span> : null}
                        </div>
                      )}
                      {visitServices.map((vs: any) => {
                        const name = isHe ? vs.service_name : (vs.service_name_ru || vs.service_name)
                        const isProd = !vs.service_id && vs.duration_minutes === 0
                        return (
                          <div key={vs.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: isProd ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isProd ? <Package size={12} color="#fbbf24" /> : <Scissors size={12} color="#60a5fa" />}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{name}</span>
                            {vs.price > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: accentText }}>₪{vs.price}</span>}
                            <button onClick={() => { removeVisitService.mutate(vs.id) }}
                              style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                        )
                      })}
                      {visitServices.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{isHe ? 'סה״כ' : 'Итого'}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: accentText }}>₪{totalPrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Заметки */}
                {visit.notes && (
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{isHe ? 'הערות' : 'Заметки'}</div>
                    <div style={{ padding: '10px 12px', background: 'rgba(253,230,138,0.08)', border: '1px solid rgba(253,230,138,0.2)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{visit.notes}</div>
                  </div>
                )}

                {/* Ссылка на встречу */}
                {visit.event_type === 'meeting' && visit.meeting_link && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                    <Video size={14} color="#34d399" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.meeting_link}</span>
                    <button onClick={() => window.open(visit.meeting_link!, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 7, background: 'rgba(52,211,153,0.2)', color: '#34d399', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <ExternalLink size={11} />{isHe ? 'הצטרף' : 'Войти'}
                    </button>
                  </div>
                )}

                {/* Последний визит */}
                {lastVisitDate && (
                  <button onClick={onShowHistory} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', width: '100%' }}>
                    <History size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'start' }}>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.05em', margin: 0 }}>{isHe ? 'ביקור אחרון' : 'Последний визит'}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>{lastVisitDate}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  </button>
                )}

                {/* Телефон */}
                {clientPhone && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`tel:${clientPhone}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 6px', borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', textDecoration: 'none', color: '#60a5fa', fontSize: 9, fontWeight: 600, letterSpacing: '.04em' }}>
                      <Phone size={14} />{isHe ? 'שיחה' : 'Звонок'}
                    </a>
                    <a href={`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 6px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', textDecoration: 'none', color: '#34d399', fontSize: 9, fontWeight: 600, letterSpacing: '.04em' }}>
                      <MessageCircle size={14} />WhatsApp
                    </a>
                  </div>
                )}
              </div>
              {/* end main panel */}

              {/* ── ACTION DRAWER ── */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '82%',
                [isRtl ? 'left' : 'right']: 0,
                background: drawerBg,
                borderInlineStart: '1px solid rgba(255,255,255,0.08)',
                overflowY: 'auto',
                transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                transform: drawerOpen ? 'translateX(0)' : (isRtl ? 'translateX(-100%)' : 'translateX(100%)'),
                zIndex: 2,
              }}>
                <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>

                  {/* Шапка шторки */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                      <BackIcon size={11} /><span>{isHe ? 'חזרה' : 'Назад'}</span>
                    </button>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{isHe ? 'פעולות' : 'Действия'}</div>
                  </div>

                  {/* Начать / Завершить */}
                  {visit.status === 'scheduled' && (
                    <ActionRow icon={<Play size={13} className="fill-current" />} label={isHe ? 'התחל ביקור' : 'Начать визит'} onClick={() => { onStart(); setDrawerOpen(false) }} iconBg="rgba(52,211,153,0.2)" iconColor="#34d399" />
                  )}
                  {visit.status === 'in_progress' && (
                    <ActionRow icon={<CheckCircle size={13} />} label={isHe ? 'סיים ביקור' : 'Завершить визит'} onClick={() => { onComplete(); setDrawerOpen(false) }} iconBg="rgba(52,211,153,0.2)" iconColor="#34d399" />
                  )}

                  {/* WhatsApp — напоминание */}
                  {clientPhone && (
                    <ActionRow icon={<MessageCircle size={13} />} label="WhatsApp" onClick={() => {
                      const dateLabel = date.toLocaleDateString(locStr, { day: 'numeric', month: 'long', year: 'numeric' })
                      const msg = isHe
                        ? `שלום ${clientName}! תזכורת לביקור ב-${dateLabel} בשעה ${timeStr}. מחכים לך! 💇`
                        : `Здравствуйте, ${clientName}! Напоминаем о визите ${dateLabel} в ${timeStr}. Ждём вас! 💇`
                      window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                    }} iconBg="rgba(52,211,153,0.2)" iconColor="#4ade80" />
                  )}

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                  {/* Добавить услугу / товар — только в процессе */}
                  {visit.status === 'in_progress' && (
                    <ActionRow
                      icon={<Plus size={13} />}
                      label={isHe ? 'הוסף שירות / מוצר' : 'Добавить услугу / товар'}
                      onClick={() => {
                        setDrawerOpen(false)
                        setServiceSearch('')
                        setAddSheetOpen(true)
                      }}
                      iconBg="rgba(167,139,250,0.2)"
                      iconColor="#a78bfa"
                    />
                  )}

                  {/* Редактировать */}
                  {visit.status !== 'completed' && (
                    <ActionRow icon={<Pencil size={12} />} label={isHe ? 'ערוך ביקור' : 'Редактировать'} onClick={() => { setDrawerOpen(false); onEdit() }} />
                  )}

                  {/* Закрыть */}
                  <ActionRow icon={<X size={12} />} label={isHe ? 'סגור' : 'Закрыть'} onClick={handleClose} />

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                  {/* Отменить визит */}
                  {(visit.status === 'scheduled' || visit.status === 'in_progress') && (
                    <ActionRow icon={<X size={12} />} label={isHe ? 'בטל ביקור' : 'Отменить визит'} onClick={() => { onCancel(); handleClose() }} danger />
                  )}
                </div>
              </div>
              {/* end action drawer */}
            </div>
            {/* end swipe zone */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(
    <>
      {content}

      {/* ── Inline Add Service Sheet ── */}
      <AnimatePresence>
        {addSheetOpen && (
          <>
            <motion.div className="fixed inset-0" style={{ zIndex: 10998, background: 'rgba(0,0,0,0.55)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: .2 }} onClick={() => setAddSheetOpen(false)} />

            <motion.div className="fixed bottom-0 left-0 right-0 flex flex-col"
              style={{ zIndex: 10999, maxHeight: '85dvh', background: 'var(--trinity-sidebar-bg, #1a2620)', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              dir={isHe ? 'rtl' : 'ltr'}>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={15} color="#a78bfa" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{isHe ? 'הוסף שירות' : 'Добавить услугу'}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{isHe ? 'בחר שירות להוספה' : 'Выберите услугу'}</div>
                </div>
                <button onClick={() => setAddSheetOpen(false)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isHe ? 'auto' : 10, right: isHe ? 10 : 'auto', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="text" value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
                    autoFocus
                    style={{ width: '100%', padding: isHe ? '8px 28px 8px 10px' : '8px 10px 8px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Services list */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2" style={{ touchAction: 'pan-y' }}>
                {allServices
                  .filter((s: any) => {
                    if (!serviceSearch) return true
                    const name = isHe ? s.name : (s.name_ru || s.name)
                    return name.toLowerCase().includes(serviceSearch.toLowerCase())
                  })
                  .map((s: any) => {
                    const name = isHe ? s.name : (s.name_ru || s.name)
                    const isAdding = addingId === s.id
                    return (
                      <button key={s.id} disabled={!!addingId}
                        onClick={async () => {
                          setAddingId(s.id)
                          try {
                            await addVisitService.mutateAsync({
                              visit_id: visit.id,
                              service_id: s.id,
                              service_name: s.name,
                              service_name_ru: s.name_ru || s.name,
                              price: s.price || 0,
                              duration_minutes: s.duration_minutes || 0,
                            })
                            queryClient.invalidateQueries({ queryKey: ['visit-services', visit.id] })
                            toast.success(isHe ? `נוסף: ${name}` : `Добавлено: ${name}`)
                            setAddSheetOpen(false)
                          } catch { toast.error(isHe ? 'שגיאה' : 'Ошибка') }
                          finally { setAddingId(null) }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', opacity: addingId && !isAdding ? 0.5 : 1 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isAdding ? <Loader2 size={14} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} /> : <Scissors size={14} color="#60a5fa" />}
                        </div>
                        <div style={{ flex: 1, textAlign: 'start' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                            {s.duration_minutes ? `${s.duration_minutes} ${isHe ? 'ד׳' : 'мин'}` : ''}{s.price ? ` · ₪${s.price}` : ''}
                          </div>
                        </div>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Plus size={13} color="#a78bfa" />
                        </div>
                      </button>
                    )
                  })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
