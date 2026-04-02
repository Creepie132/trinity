'use client'
// ─── ToastStack ───────────────────────────────────────────────────────────────
// Desktop: bottom-right, 380px. Hover → expand колонку.
// Mobile:  top-center, full-width. Flat список.
//
// FIX: убран хардкод collapsedHeight (120px). Теперь используем
// ResizeObserver на топовой карточке — стек знает реальную высоту.
// Второй и третий тост рендерятся как peek через translateY + scale,
// не через absolute позицию с фиксированным offset.

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNotificationStore } from './NotificationStore'
import { NotificationItem } from './NotificationItem'

const ENTRY_CSS = `
@keyframes t-in-r {
  from { transform: translateX(calc(100% + 24px)); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes t-in-t {
  from { transform: translateY(-110%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('trinity-toast-css')) return
  const s = document.createElement('style')
  s.id = 'trinity-toast-css'
  s.textContent = ENTRY_CSS
  document.head.appendChild(s)
}

// ── Collapsed desktop stack: renders N cards with peek ────────────────────────
// Top card (index=0) is full visible. Cards 1,2,3 peek behind as scaled ghosts.
// Heights are measured via ResizeObserver so no hardcoding needed.
function CollapsedStack({ toasts, onExpand }: {
  toasts: ReturnType<typeof useNotificationStore.getState>['toasts']
  onExpand: () => void
}) {
  const topRef    = useRef<HTMLDivElement>(null)
  const [topH, setTopH] = useState(0)

  useEffect(() => {
    const el = topRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setTopH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [toasts[0]?.id]) // re-observe when top card changes

  // Peek offset per card behind top
  const PEEK = 8   // px per level
  const SCALE_STEP = 0.04

  // Total container height = top card + peek of cards behind
  const peekCount = Math.min(toasts.length - 1, 3)
  const containerH = topH > 0 ? topH + peekCount * PEEK : 'auto'

  return (
    <div
      style={{ position: 'relative', height: containerH, cursor: 'pointer' }}
      onClick={toasts.length > 1 ? onExpand : undefined}
    >
      {/* Render cards bottom→top so top card is on top visually */}
      {[...toasts].slice(0, 4).reverse().map((toast, revIdx) => {
        // revIdx=0 is the oldest (bottom of stack), revIdx=last is newest (top)
        const idx = toasts.slice(0, 4).length - 1 - revIdx // 0=newest
        const isTop = idx === 0
        const peekY = -idx * PEEK
        const scale = 1 - idx * SCALE_STEP
        const opacity = idx === 0 ? 1 : idx === 1 ? 0.80 : idx === 2 ? 0.55 : 0.35

        return (
          <div
            key={toast.id}
            ref={isTop ? topRef : undefined}
            style={{
              position:   'absolute',
              bottom:     0,
              left:       0,
              right:      0,
              zIndex:     toasts.length - idx,
              transform:  toast.isExiting
                ? 'translateX(calc(100% + 28px))'
                : `translateY(${peekY}px) scale(${scale})`,
              opacity:    toast.isExiting ? 0 : opacity,
              transformOrigin: 'bottom center',
              transition: toast.isExiting
                ? 'transform 0.30s cubic-bezier(0.4,0,1,1), opacity 0.24s ease'
                : 'transform 0.40s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease',
              pointerEvents: isTop ? 'auto' : 'none',
              // Entry animation only for newest card
              animation: isTop && !toast.isExiting
                ? `t-in-r 0.42s cubic-bezier(0.22,1,0.36,1) both`
                : undefined,
            }}
          >
            <NotificationItem toast={toast} index={idx} total={toasts.length} isExpanded={false} />
          </div>
        )
      })}
    </div>
  )
}

// ── ExpandedStack: full column, newest on top ─────────────────────────────────
function ExpandedStack({ toasts, onDismissAll }: {
  toasts: ReturnType<typeof useNotificationStore.getState>['toasts']
  onDismissAll: () => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      {toasts.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <button
            onClick={onDismissAll}
            style={{
              fontSize: 11, color: '#9ca3af', background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 8px', borderRadius: 6,
            }}
          >
            Закрыть все
          </button>
        </div>
      )}
      {/* Column: newest on top, each card in normal flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((toast, idx) => (
          <div
            key={toast.id}
            style={{
              opacity:    toast.isExiting ? 0 : 1,
              transform:  toast.isExiting ? 'translateX(calc(100% + 28px))' : 'none',
              transition: 'transform 0.30s cubic-bezier(0.4,0,1,1), opacity 0.24s ease',
              // Entry only for truly new card (idx=0)
              animation: idx === 0 && !toast.isExiting
                ? `t-in-r 0.42s cubic-bezier(0.22,1,0.36,1) both`
                : undefined,
            }}
          >
            <NotificationItem toast={toast} index={idx} total={toasts.length} isExpanded={true} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ToastStack ───────────────────────────────────────────────────────────
export function ToastStack() {
  const { toasts, dismissAll } = useNotificationStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    setMounted(true)
    injectStyles()
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-collapse when only 1 toast remains
  useEffect(() => {
    if (toasts.length <= 1) setIsExpanded(false)
  }, [toasts.length])

  // Escape — dismiss topmost
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        useNotificationStore.getState().dismiss(toasts[0].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts])

  if (!mounted || toasts.length === 0) return null

  const wrapStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', top: 12, left: 10, right: 10, zIndex: 99999 }
    : { position: 'fixed', bottom: 24, right: 24, width: 380, zIndex: 99999 }

  return createPortal(
    <div
      style={wrapStyle}
      onMouseEnter={() => { if (!isMobile && toasts.length > 1) setIsExpanded(true) }}
      onMouseLeave={() => { if (!isMobile) setIsExpanded(false) }}
    >
      {/* ── Mobile: flat newest-on-top list ── */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map((toast, idx) => (
            <div
              key={toast.id}
              style={{
                opacity:   toast.isExiting ? 0 : 1,
                transform: toast.isExiting ? 'translateY(-110%)' : 'none',
                transition: 'transform 0.28s ease, opacity 0.22s ease',
                animation: idx === 0 && !toast.isExiting
                  ? `t-in-t 0.38s cubic-bezier(0.22,1,0.36,1) both`
                  : undefined,
              }}
            >
              <NotificationItem toast={toast} index={idx} total={toasts.length} isExpanded={true} />
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop: collapsed stack or expanded column ── */}
      {!isMobile && (
        isExpanded
          ? <ExpandedStack toasts={toasts} onDismissAll={dismissAll} />
          : <CollapsedStack toasts={toasts} onExpand={() => setIsExpanded(true)} />
      )}
    </div>,
    document.body
  )
}
