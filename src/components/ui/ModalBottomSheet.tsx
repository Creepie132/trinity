'use client'

/**
 * ModalBottomSheet — мобильный bottom sheet для Trinity модалок.
 *
 * Snap-точки:
 *   half  → translateY(45dvh)  — начальное состояние, видна шапка + часть формы
 *   full  → translateY(0)      — полный экран (свайп вверх из half)
 *   closed → translateY(100%)  — закрыт (свайп вниз из half)
 *
 * Свайп фона заблокирован через:
 *   1. document.body.style.overflow = 'hidden'
 *   2. document.body.style.touchAction = 'none'  ← iOS Safari
 *   3. overlay с touchAction: 'none'              ← перехватывает все тачи поверх
 *
 * Используется ТОЛЬКО на мобиле (< 768px).
 * Десктоп рендерит children напрямую (без sheet-обёртки).
 */

import { useEffect, useRef, useState, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SnapState = 'half' | 'full' | 'closed'

interface ModalBottomSheetProps {
  open: boolean
  onClose: () => void
  /** Иконка в тёмной шапке (Lucide ReactNode) */
  icon?: ReactNode
  /** Заголовок в шапке */
  title: string
  /** Подзаголовок под заголовком */
  subtitle?: string
  /** Цвет фона шапки (из ThemeContext) */
  sidebarBg?: string
  /** Цвет акцента — иконка-кружок (из ThemeContext) */
  accentColor?: string
  /** Содержимое формы */
  children: ReactNode
  /** dir для RTL/LTR */
  dir?: 'rtl' | 'ltr'
}

// ─── Snap helpers ─────────────────────────────────────────────────────────────

/** translateY в px от верха экрана для каждого snap-состояния */
function getSnapY(state: SnapState, screenH: number): number {
  if (state === 'full')   return 0
  if (state === 'half')   return screenH * 0.45
  return screenH           // closed — за нижним краем
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModalBottomSheet({
  open,
  onClose,
  icon,
  title,
  subtitle,
  sidebarBg,
  accentColor,
  children,
  dir = 'ltr',
}: ModalBottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [snapState, setSnapState] = useState<SnapState>('closed')
  const [translateY, setTranslateY] = useState(0)
  const [animated, setAnimated] = useState(true)

  // touch tracking
  const touchStartY   = useRef(0)
  const touchStartTY  = useRef(0)
  const dragging      = useRef(false)
  const sheetRef      = useRef<HTMLDivElement>(null)

  // ── Mount ────────────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  // ── Snap to state ────────────────────────────────────────────────────────────
  const snapTo = useCallback((state: SnapState, anim = true) => {
    const h = window.innerHeight
    setAnimated(anim)
    setSnapState(state)
    setTranslateY(getSnapY(state, h))
  }, [])

  // ── Open / close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Блокируем фон — overflow + touchAction (iOS Safari)
      document.body.style.overflow    = 'hidden'
      document.body.style.touchAction = 'none'
      snapTo('half')
    } else {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
      snapTo('closed')
    }
    return () => {
      document.body.style.overflow    = ''
      document.body.style.touchAction = ''
    }
  }, [open, snapTo])

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ── Touch: start ─────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Не перехватываем тачи внутри скроллящегося контента (только шапка + pill)
    dragging.current   = true
    touchStartY.current  = e.touches[0].clientY
    touchStartTY.current = translateY
    setAnimated(false)
  }, [translateY])

  // ── Touch: move ──────────────────────────────────────────────────────────────
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    const next  = Math.max(0, touchStartTY.current + delta)
    setTranslateY(next)
  }, [])

  // ── Touch: end ───────────────────────────────────────────────────────────────
  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false

    const h     = window.innerHeight
    const delta = translateY - touchStartTY.current
    const vel   = delta // упрощённая velocity

    if (snapState === 'half') {
      if (vel < -60)      snapTo('full')   // резкий свайп вверх
      else if (vel > 60)  { snapTo('closed'); setTimeout(onClose, 350) }
      else                 snapTo('half')
    } else if (snapState === 'full') {
      // Из full — только вниз в half (не в closed напрямую)
      if (vel > 80) snapTo('half')
      else          snapTo('full')
    }
  }, [translateY, snapState, snapTo, onClose])

  // ── Sheet height ─────────────────────────────────────────────────────────────
  // Full screen: 100dvh; half: остаток снизу
  const sheetHeight = snapState === 'full' ? '100dvh' : '55dvh'
  const contentMaxH = snapState === 'full' ? 'calc(100dvh - 72px)' : 'calc(55dvh - 72px)'

  // ─── Цвета из theme ───────────────────────────────────────────────────────────
  const bg     = sidebarBg   || 'var(--trinity-sidebar-bg, #1e2533)'
  const accent = accentColor || 'var(--trinity-accent, #4a6fa5)'

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (!mounted || !open) return null

  return createPortal(
    <>
      {/* ── Overlay — перехватывает ВСЕ тачи фона ──────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 9990, touchAction: 'none' }}
        onClick={onClose}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        aria-hidden="true"
      />

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        dir={dir}
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          height:          sheetHeight,
          zIndex:          9999,
          transform:       `translateY(${translateY}px)`,
          transition:      animated ? 'transform .35s cubic-bezier(.32,.72,0,1)' : 'none',
          borderRadius:    '16px 16px 0 0',
          overflow:        'hidden',
          display:         'flex',
          flexDirection:   'column',
          willChange:      'transform',
          touchAction:     'none',   // sheet сам управляет всеми тачами
        }}
      >
        {/* ── Тёмная шапка ─────────────────────────────────────────────────── */}
        <div
          style={{ background: bg, flexShrink: 0 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Pill — скрыт в full */}
          {snapState !== 'full' && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.25)',
              }} />
            </div>
          )}

          {/* Заголовок шапки */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            gap:            12,
            padding:        snapState === 'full' ? '14px 16px 14px' : '10px 16px 14px',
          }}>
            {icon && (
              <div style={{
                width:           36, height: 36, borderRadius: '50%',
                background:      accent,
                display:         'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink:      0, color: '#fff',
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

            {/* Expand / collapse кнопка */}
            <button
              onClick={() => snapState === 'full' ? snapTo('half') : snapTo('full')}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={snapState === 'full' ? 'Свернуть' : 'Развернуть'}
            >
              {/* Стрелка — вниз в full, вверх в half */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                {snapState === 'full'
                  ? <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                }
              </svg>
            </button>

            {/* Закрыть */}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Закрыть"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Контент ──────────────────────────────────────────────────────── */}
        <div
          style={{
            flex:               1,
            background:         'var(--trinity-content-bg, #f8f9fc)',
            overflowY:          'auto',
            overscrollBehavior: 'contain',
            // Разрешаем вертикальный скролл внутри контента — но только
            // когда sheet в full-режиме, иначе тач управляет snap-ом
            touchAction:        snapState === 'full' ? 'pan-y' : 'none',
            padding:            '20px 16px 32px',
            maxHeight:          contentMaxH,
          }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
