'use client'

/**
 * TrinityMobDetailShell — универсальная мобильная шторка для деталей записей.
 * Архитектура точно как TrinityMob:
 *   - Drag-to-close по вертикали
 *   - SwipeZone: mainPanel смещается, actionDrawer выезжает
 *   - LTR: свайп влево → открыть действия
 *   - RTL: свайп вправо → открыть действия
 *   - Кнопка-хинт в main panel
 * 
 * Props:
 *   title, subtitle, avatarContent — шапка
 *   children — основной контент (info panel)
 *   actions — массив кнопок в шторке действий
 *   locale, dir
 */

import { useRef, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export interface MobDetailAction {
  icon: ReactNode
  label: string
  onClick: () => void
  /** 'default' | 'danger' | 'green' | 'blue' | 'purple' */
  variant?: 'default' | 'danger' | 'green' | 'blue' | 'purple'
  disabled?: boolean
  loading?: boolean
  hidden?: boolean
}

interface TrinityMobDetailShellProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** ReactNode внутри круга-аватара */
  avatarContent: ReactNode
  /** Фон аватара */
  avatarBg?: string
  /** Основной контент (скроллируется) */
  children: ReactNode
  /** Действия в шторке */
  actions: MobDetailAction[]
  /** Заголовок шторки действий */
  actionsTitle?: string
  locale: 'he' | 'ru'
}

const VARIANT_STYLE: Record<string, { bg: string; border: string; color: string; iconBg: string }> = {
  default: { bg: 'transparent', border: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', iconBg: 'rgba(255,255,255,0.07)' },
  danger:  { bg: 'transparent', border: 'rgba(239,68,68,0.22)', color: '#f87171', iconBg: 'rgba(239,68,68,0.14)' },
  green:   { bg: 'transparent', border: 'rgba(34,197,94,0.25)', color: '#34d399', iconBg: 'rgba(34,197,94,0.15)' },
  blue:    { bg: 'transparent', border: 'rgba(96,165,250,0.25)', color: '#60a5fa', iconBg: 'rgba(96,165,250,0.12)' },
  purple:  { bg: 'transparent', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc', iconBg: 'rgba(99,102,241,0.12)' },
}

export function TrinityMobDetailShell({
  open, onClose, title, subtitle, avatarContent, avatarBg,
  children, actions, actionsTitle, locale,
}: TrinityMobDetailShellProps) {
  const isRtl = locale === 'he'
  const dir   = isRtl ? 'rtl' : 'ltr'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const sidebarBg  = 'var(--trinity-sidebar-bg, #1a2620)'
  const drawerBg   = 'color-mix(in srgb, var(--trinity-sidebar-bg, #1a2620) 82%, black)'

  const [mounted, setMounted]     = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Вертикальный drag-to-close
  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging = useRef(false)
  const startYRef  = useRef(0)
  const startYVal  = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerH    = useRef(0)

  // Горизонтальный свайп
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      y.set(0)
      setDrawerOpen(false)
      document.body.style.overflow    = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
  }, [open, y])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  function handleClose() { setDrawerOpen(false); onClose() }

  // Vertical drag
  function onHandleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startYRef.current  = e.touches[0].clientY
    startYVal.current  = y.get()
    if (contentRef.current) drawerH.current = contentRef.current.offsetHeight
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    y.set(Math.max(0, startYVal.current + (e.touches[0].clientY - startYRef.current)))
  }
  function onHandleTouchEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    if (y.get() > (drawerH.current || 600) * 0.35) {
      animate(y, drawerH.current || 800, { type: 'tween', duration: .25, ease: [.32,.72,0,1], onComplete: handleClose })
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  // Horizontal swipe
  function onContentTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onContentTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > Math.abs(dx) || Math.abs(dx) < 40) return
    if (!drawerOpen) {
      if (isRtl && dx > 50) setDrawerOpen(true)
      else if (!isRtl && dx < -50) setDrawerOpen(true)
    } else {
      if (isRtl && dx < -50) setDrawerOpen(false)
      else if (!isRtl && dx > 50) setDrawerOpen(false)
    }
  }

  const swipeHint = isRtl
    ? '› החלק ימינה — פעולות ‹'
    : '‹ Свайп влево — действия ›'

  if (!mounted || !open) return null

  return createPortal(
    <AnimatePresence>
      {open && <>
        <motion.div key="detail-overlay" className="fixed inset-0 bg-black/55"
          style={{ opacity: overlayOpacity, zIndex: 9998 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: .2 }} onClick={handleClose}
        />
        <motion.div key="detail-sheet" ref={contentRef}
          className="fixed bottom-0 left-0 right-0 flex flex-col outline-none"
          style={{ y, zIndex: 9999, height: 'calc(100dvh - 3rem)', background: sidebarBg,
            borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)',
            borderBottom: 'none', touchAction: 'none', overflow: 'hidden' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          dir={dir}
        >
          {/* Drag pill */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab select-none"
            style={{ touchAction: 'none' }}
            onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}>
            <div className="w-10 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: avatarBg || 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white' }}>
              {avatarContent}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{subtitle}</div>}
            </div>
            <button onClick={handleClose}
              style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* Swipe zone */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
            onTouchStart={onContentTouchStart} onTouchEnd={onContentTouchEnd}>

            {/* MAIN PANEL */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              overflowY: 'auto', padding: '14px 14px 24px',
              touchAction: 'pan-y',
              transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
              transform: drawerOpen ? (isRtl ? 'translateX(76%)' : 'translateX(-76%)') : 'translateX(0)',
            }}>
              {/* Swipe hint button */}
              <button onClick={() => setDrawerOpen(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  margin: '0 auto 12px', padding: '5px 13px', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer' }}>
                {swipeHint}
              </button>
              {children}
            </div>

            {/* ACTION DRAWER */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: '82%',
              [isRtl ? 'left' : 'right']: 0,
              background: drawerBg,
              borderInlineStart: '1px solid rgba(255,255,255,0.08)',
              overflowY: 'auto',
              transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
              transform: drawerOpen ? 'translateX(0)' : (isRtl ? 'translateX(-100%)' : 'translateX(100%)'),
              zIndex: 2,
              padding: '12px 13px',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              {/* Header шторки */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <button onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.45)', fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                  <BackIcon size={11} />
                  <span>{locale === 'he' ? 'חזרה' : 'Назад'}</span>
                </button>
              </div>
              {actionsTitle && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>
                  {actionsTitle}
                </div>
              )}
              {/* Кнопки действий */}
              {actions.filter(a => !a.hidden).map((action, i) => {
                const vs = VARIANT_STYLE[action.variant || 'default']
                return (
                  <button key={i} onClick={action.onClick} disabled={action.disabled || action.loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
                      borderRadius: 11, width: '100%', border: `1px solid ${vs.border}`,
                      background: vs.bg, cursor: action.disabled ? 'default' : 'pointer',
                      color: vs.color, fontSize: 12, fontWeight: 500,
                      opacity: (action.disabled || action.loading) ? 0.55 : 1,
                      transition: 'opacity .15s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: vs.iconBg, color: vs.color }}>
                      {action.icon}
                    </div>
                    <span style={{ flex: 1, textAlign: 'start' }}>{action.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>›</span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </>}
    </AnimatePresence>,
    document.body
  )
}
