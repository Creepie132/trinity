'use client'
// ─── NotificationItem ────────────────────────────────────────────────────────
// Premium animated toast card. Linear / Stripe aesthetic.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  CreditCard, User, Calendar, CheckSquare,
  Settings, Zap, X,
} from 'lucide-react'
import type { ToastItem } from './types'
import { useNotificationStore } from './NotificationStore'

// ── Variant config ────────────────────────────────────────────────────────────
const VARIANT_CONFIG = {
  success:  { icon: CheckCircle2,  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', text: '#065f46' },
  error:    { icon: XCircle,       color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  warning:  { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  info:     { icon: Info,          color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
  payment:  { icon: CreditCard,    color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' },
  client:   { icon: User,          color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e' },
  visit:    { icon: Calendar,      color: '#14b8a6', bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
  task:     { icon: CheckSquare,   color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
  system:   { icon: Settings,      color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', text: '#334155' },
  critical: { icon: Zap,           color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d' },
} as const

const PRIORITY_RING: Record<string, string> = {
  normal: '',
  high:   '0 0 0 1px rgba(251,191,36,0.5)',
  urgent: '0 0 0 2px rgba(239,68,68,0.6)',
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({
  duration, isPaused, color, onExpire,
}: { duration: number; isPaused: boolean; color: string; onExpire: () => void }) {
  const [progress, setProgress]   = useState(100)
  const startRef   = useRef(Date.now())
  const elapsedRef = useRef(0)
  const rafRef     = useRef(0)

  const tick = useCallback(() => {
    const elapsed   = elapsedRef.current + (Date.now() - startRef.current)
    const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
    setProgress(remaining)
    if (remaining <= 0) { onExpire(); return }
    rafRef.current = requestAnimationFrame(tick)
  }, [duration, onExpire])

  useEffect(() => {
    if (isPaused) {
      elapsedRef.current += Date.now() - startRef.current
      cancelAnimationFrame(rafRef.current)
    } else {
      startRef.current = Date.now()
      rafRef.current   = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPaused, tick])

  if (duration === 0) return null
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] overflow-hidden rounded-b-2xl bg-black/5">
      <div style={{ width: `${progress}%`, backgroundColor: color, height: '100%', opacity: 0.6 }} />
    </div>
  )
}

// ── NotificationItem ──────────────────────────────────────────────────────────
interface NotificationItemProps {
  toast:      ToastItem
  index:      number   // 0 = topmost (newest)
  total:      number
  isExpanded: boolean
}

export function NotificationItem({ toast, index, total, isExpanded }: NotificationItemProps) {
  const { _startExit, pauseToast, resumeToast } = useNotificationStore()
  const cfg     = VARIANT_CONFIG[toast.variant]
  const IconCmp = cfg.icon

  // Stacking physics
  const stackY       = isExpanded ? 0    : index * 7
  const stackScale   = isExpanded ? 1    : 1 - index * 0.04
  const stackOpacity = isExpanded ? 1    : index === 0 ? 1 : index === 1 ? 0.82 : index === 2 ? 0.6 : 0.35

  const cardStyle: React.CSSProperties = {
    transform:  toast.isExiting
      ? 'translateX(calc(100% + 28px))'
      : `translateY(${stackY}px) scale(${stackScale})`,
    opacity: toast.isExiting ? 0 : stackOpacity,
    zIndex:  total - index,
    transition: toast.isExiting
      ? 'transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.25s ease'
      : 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
    pointerEvents: (index === 0 || isExpanded) ? 'auto' : 'none',
    backgroundColor: cfg.bg,
    borderColor:     cfg.border,
    boxShadow: [
      '0 4px 16px rgba(0,0,0,0.08)',
      '0 1px 3px rgba(0,0,0,0.06)',
      PRIORITY_RING[toast.priority],
    ].filter(Boolean).join(', '),
  }

  return (
    <div
      role="alert"
      aria-live={toast.priority === 'urgent' ? 'assertive' : 'polite'}
      style={cardStyle}
      onMouseEnter={() => pauseToast(toast.id)}
      onMouseLeave={() => resumeToast(toast.id)}
      className="absolute bottom-0 left-0 right-0 rounded-2xl border flex flex-col overflow-hidden select-none"
    >
      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
          style={{ backgroundColor: cfg.color + '1a' }}
        >
          {toast.icon
            ? <span className="text-lg leading-none">{toast.icon}</span>
            : <IconCmp size={17} style={{ color: cfg.color }} strokeWidth={2.2} />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-semibold leading-snug" style={{ color: cfg.text }}>
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-2"
               style={{ color: cfg.text, opacity: 0.68 }}>
              {toast.description}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={() => _startExit(toast.id)}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                     opacity-35 hover:opacity-65 transition-opacity -mt-0.5 -mr-0.5"
          aria-label="Закрыть"
        >
          <X size={13} style={{ color: cfg.text }} />
        </button>
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      {(toast.action || toast.secondaryAction) && (
        <div className="flex items-center gap-2 px-4 pb-3.5 -mt-0.5">
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); _startExit(toast.id) }}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 text-white"
              style={{ backgroundColor: cfg.color }}
            >
              {toast.action.label}
            </button>
          )}
          {toast.secondaryAction && (
            <button
              onClick={() => { toast.secondaryAction!.onClick(); _startExit(toast.id) }}
              className="text-[12px] font-medium px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ color: cfg.text, opacity: 0.65 }}
            >
              {toast.secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* ── Progress bar ───────────────────────────────────────────── */}
      <ProgressBar
        duration={toast.duration}
        isPaused={toast.isPaused}
        color={cfg.color}
        onExpire={() => _startExit(toast.id)}
      />
    </div>
  )
}
