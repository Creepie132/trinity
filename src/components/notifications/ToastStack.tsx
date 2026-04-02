'use client'
// ─── ToastStack — Premium stacked toast container ────────────────────────────
// Desktop: bottom-right, 380px wide
// Mobile:  top-center, full-width minus padding
// Hover: stack expands to show all toasts
// Keyboard: Escape dismisses topmost

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNotificationStore } from './NotificationStore'
import { NotificationItem } from './NotificationItem'

// Entry animation — slide in from right (desktop) or top (mobile)
const ENTRY_KEYFRAMES = `
@keyframes trinity-toast-in-desktop {
  from { transform: translateX(calc(100% + 24px)); opacity: 0; }
  to   { transform: translateX(0);                opacity: 1; }
}
@keyframes trinity-toast-in-mobile {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('trinity-toast-styles')) return
  const el = document.createElement('style')
  el.id = 'trinity-toast-styles'
  el.textContent = ENTRY_KEYFRAMES
  document.head.appendChild(el)
}

export function ToastStack() {
  const { toasts, dismissAll } = useNotificationStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)
  const [mounted, setMounted]       = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    injectStyles()
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Collapse stack when last toast dismissed
  useEffect(() => {
    if (toasts.length === 0) setIsExpanded(false)
  }, [toasts.length])

  // Escape key dismisses topmost
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && toasts.length > 0) {
        useNotificationStore.getState().dismiss(toasts[0].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts])

  if (!mounted || toasts.length === 0) return null

  // Collapsed stack height: top card + subtle peek of cards behind
  const collapsedHeight = toasts.length > 1
    ? 120 + (Math.min(toasts.length, 3) - 1) * 6
    : 'auto'

  // Expanded: each card full height + gap
  const expandedGap = 10

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: '16px',
        left: '12px',
        right: '12px',
        zIndex: 99999,
      }
    : {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        zIndex: 99999,
      }

  return createPortal(
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
    >
      {/* ── Mobile: flat list, newest on top ── */}
      {isMobile ? (
        <div className="flex flex-col gap-2">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              style={{
                animation: `trinity-toast-in-mobile 0.38s cubic-bezier(0.22,1,0.36,1) both`,
              }}
            >
              <NotificationItem
                toast={toast}
                index={index}
                total={toasts.length}
                isExpanded={true}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop: stacked with hover-expand ── */
        <div
          className="relative transition-all duration-400 ease-out"
          style={{
            height: isExpanded
              ? 'auto'
              : collapsedHeight,
          }}
        >
          {/* Dismiss-all button — visible when expanded and multiple toasts */}
          {isExpanded && toasts.length > 1 && (
            <div className="absolute -top-8 right-0">
              <button
                onClick={dismissAll}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100/80"
              >
                Закрыть все
              </button>
            </div>
          )}

          {/* Expanded: column layout */}
          {isExpanded ? (
            <div className="flex flex-col-reverse gap-[10px]">
              {toasts.map((toast, index) => (
                <div
                  key={toast.id}
                  className="relative"
                  style={{ minHeight: 72 }}
                >
                  <NotificationItem
                    toast={toast}
                    index={index}
                    total={toasts.length}
                    isExpanded={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Collapsed: absolute stack */
            <div className="relative" style={{ height: collapsedHeight }}>
              {[...toasts].reverse().map((toast, revIdx) => {
                const index = toasts.length - 1 - revIdx
                return (
                  <div
                    key={toast.id}
                    className="absolute left-0 right-0"
                    style={{
                      bottom:    0,
                      animation: index === 0
                        ? `trinity-toast-in-desktop 0.42s cubic-bezier(0.22,1,0.36,1) both`
                        : undefined,
                    }}
                  >
                    <NotificationItem
                      toast={toast}
                      index={index}
                      total={toasts.length}
                      isExpanded={false}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}
