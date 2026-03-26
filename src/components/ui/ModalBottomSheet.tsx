'use client'

/**
 * ModalBottomSheet — мобильный bottom sheet для Trinity модалок.
 *
 * Поведение:
 *   - Открывается на 92% высоты экрана (почти полный экран)
 *   - Шапка фиксирована сверху
 *   - Контент скроллится в середине
 *   - Footer с кнопками фиксирован снизу (через prop footerContent)
 *   - Свайп за pill/шапку вниз = закрыть
 *   - Escape = закрыть
 *
 * Usage:
 *   <ModalBottomSheet ... footerContent={<><Button>Отмена</Button><Button>Сохранить</Button></>}>
 *     {formContent}
 *   </ModalBottomSheet>
 */

import { useEffect, useRef, useState, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalBottomSheetProps {
  open: boolean
  onClose: () => void
  icon?: ReactNode
  title: string
  subtitle?: string
  sidebarBg?: string
  accentColor?: string
  children: ReactNode
  /** Кнопки действий — всегда видны в sticky footer */
  footerContent?: ReactNode
  dir?: 'rtl' | 'ltr'
}

export function ModalBottomSheet({
  open,
  onClose,
  icon,
  title,
  subtitle,
  sidebarBg,
  accentColor,
  children,
  footerContent,
  dir = 'ltr',
}: ModalBottomSheetProps) {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)   // управляет translateY
  const [animating, setAnimating] = useState(false)

  const touchStartY  = useRef(0)
  const touchCurY    = useRef(0)
  const isDragging   = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)    // px смещение во время свайпа

  const bg     = sidebarBg   || 'var(--trinity-sidebar-bg, #1e2533)'
  const accent = accentColor || 'var(--trinity-accent, #4a6fa5)'

  useEffect(() => { setMounted(true) }, [])


  // ── Open / close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow    = 'hidden'
      document.body.style.touchAction = 'none'
      setAnimating(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
  }, [open, setVisible])

  // ── Escape ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ── Touch: pill/header drag ───────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true
    touchStartY.current = e.touches[0].clientY
    touchCurY.current   = e.touches[0].clientY
    setAnimating(false)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    touchCurY.current = e.touches[0].clientY
    setDragOffset(Math.max(0, delta))   // только вниз
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    setAnimating(true)
    if (dragOffset > 80) {
      setVisible(false)
      setDragOffset(0)
      setTimeout(onClose, 320)
    } else {
      setDragOffset(0)
    }
  }, [dragOffset, onClose])


  // ── Transient translateY ──────────────────────────────────────────────────
  // visible=true → 0px (на месте), visible=false → 100% (ушёл вниз)
  // + dragOffset во время свайпа
  const translateY = !visible ? '100%' : `${dragOffset}px`
  const transition = animating
    ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    : 'none'

  if (!mounted || !open) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{
          position:    'fixed',
          inset:       0,
          background:  'rgba(0,0,0,0.5)',
          zIndex:      9990,
          touchAction: 'none',
          opacity:     visible ? 1 : 0,
          transition:  'opacity 0.3s ease',
        }}
        onClick={onClose}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        dir={dir}
        style={{
          position:      'fixed',
          bottom:        0,
          left:          0,
          right:         0,
          height:        '92dvh',
          zIndex:        9999,
          transform:     `translateY(${translateY})`,
          transition,
          borderRadius:  '18px 18px 0 0',
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
          willChange:    'transform',
          touchAction:   'none',
          background:    'var(--trinity-content-bg, #f8f9fc)',
        }}
      >

        {/* ── Drag pill ─────────────────────────────────────────────────── */}
        <div
          style={{ background: bg, flexShrink: 0, cursor: 'grab' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
          </div>

          {/* Header */}
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           12,
            padding:       '8px 16px 14px',
          }}>
            {icon && (
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#fff',
              }}>
                <span style={{ display: 'flex', width: 18, height: 18 }}>{icon}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                {title}
              </p>
              {subtitle && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.4 }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Закрыть"
            >
              <X size={14} />
            </button>
          </div>
        </div>


        {/* ── Scrollable content ────────────────────────────────────────── */}
        <div
          style={{
            flex:               1,
            overflowY:          'auto',
            overscrollBehavior: 'contain',
            touchAction:        'pan-y',   // скролл контента всегда работает
            padding:            '20px 16px',
            // Extra bottom padding so sticky footer never overlaps last content item
            paddingBottom:      footerContent ? '80px' : '20px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {/* ── Sticky footer — всегда виден ─────────────────────────────── */}
        {footerContent && (
          <div
            style={{
              flexShrink:    0,
              padding:       '12px 16px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              borderTop:     '1px solid rgba(0,0,0,0.08)',
              background:    'var(--trinity-content-bg, #f8f9fc)',
              display:       'flex',
              gap:           10,
              width:         '100%',
            }}
          >
            <div style={{ width: '100%' }}>{footerContent}</div>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
