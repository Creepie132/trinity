'use client'
// ─── NotificationItem ────────────────────────────────────────────────────────
// Карточка НЕ управляет своей позицией — это делает ToastStack (CollapsedStack / ExpandedStack).
// Карточка только рисует контент + progress bar.

import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  CreditCard, User, Calendar, CheckSquare,
  Settings, Zap, X,
} from 'lucide-react'
import type { ToastItem } from './types'
import { useNotificationStore } from './NotificationStore'

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

const PRIORITY_SHADOW: Record<string, string> = {
  normal: '',
  high:   '0 0 0 1.5px rgba(251,191,36,0.55)',
  urgent: '0 0 0 2px rgba(239,68,68,0.65)',
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ duration, isPaused, color, onExpire }: {
  duration: number; isPaused: boolean; color: string; onExpire: () => void
}) {
  const [pct, setPct] = useState(100)
  const startRef   = useRef(Date.now())
  const elapsedRef = useRef(0)
  const rafRef     = useRef(0)

  const tick = useCallback(() => {
    const elapsed   = elapsedRef.current + (Date.now() - startRef.current)
    const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
    setPct(remaining)
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
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: 'rgba(0,0,0,0.07)', borderRadius: '0 0 14px 14px' }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, opacity: 0.6 }} />
    </div>
  )
}

// ── NotificationItem ──────────────────────────────────────────────────────────
interface NotificationItemProps {
  toast:      ToastItem
  index:      number
  total:      number
  isExpanded: boolean
}

export function NotificationItem({ toast, isExpanded }: NotificationItemProps) {
  const { _startExit, pauseToast, resumeToast } = useNotificationStore()
  const cfg     = VARIANT_CONFIG[toast.variant]
  const IconCmp = cfg.icon

  const shadowParts = [
    '0 4px 20px rgba(0,0,0,0.10)',
    '0 1px 4px rgba(0,0,0,0.06)',
    PRIORITY_SHADOW[toast.priority],
  ].filter(Boolean)

  const cardStyle: React.CSSProperties = {
    position:        'relative',        // ← НЕ absolute. Позиция управляется родителем.
    width:           '100%',
    borderRadius:    16,
    border:          `1px solid ${cfg.border}`,
    backgroundColor: cfg.bg,
    boxShadow:       shadowParts.join(', '),
    overflow:        'hidden',
    userSelect:      'none',
  }

  return (
    <div
      role="alert"
      aria-live={toast.priority === 'urgent' ? 'assertive' : 'polite'}
      style={cardStyle}
      onMouseEnter={() => pauseToast(toast.id)}
      onMouseLeave={() => resumeToast(toast.id)}
    >
      {/* ── Body ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px 12px', paddingRight: 44 }}>
        {/* Icon */}
        <div style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: cfg.color + '1a', marginTop: 1,
        }}>
          {toast.icon
            ? <span style={{ fontSize: 16 }}>{toast.icon}</span>
            : <IconCmp size={17} color={cfg.color} strokeWidth={2.2} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: cfg.text }}>
            {toast.title}
          </p>
          {toast.description && (
            <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.45, color: cfg.text, opacity: 0.68,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {toast.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Close button — крупная, всегда видима ── */}
      <button
        onClick={() => _startExit(toast.id)}
        aria-label="Закрыть"
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, borderRadius: 8, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.07)', cursor: 'pointer',
          color: cfg.text, opacity: 0.65,
          transition: 'opacity 0.15s, background 0.15s, transform 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.13)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.65'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.07)' }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.90)' }}
        onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      {/* ── Actions ──────────────────────────────── */}
      {(toast.action || toast.secondaryAction) && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', marginTop: -2 }}>
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); _startExit(toast.id) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', color: '#fff', background: cfg.color,
                transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {toast.action.label}
            </button>
          )}
          {toast.secondaryAction && (
            <button
              onClick={() => { toast.secondaryAction!.onClick(); _startExit(toast.id) }}
              style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer', background: 'transparent', color: cfg.text, opacity: 0.6 }}
            >
              {toast.secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* ── Progress bar ─────────────────────────── */}
      <ProgressBar
        duration={toast.duration}
        isPaused={toast.isPaused}
        color={cfg.color}
        onExpire={() => _startExit(toast.id)}
      />
    </div>
  )
}
