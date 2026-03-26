'use client'

/**
 * TrinityModalShell — canonical shell for Trinity modals.
 *
 * Desktop (≥ 768px):
 *   Grid layout: dark sidebar (176px) + white content area.
 *   Used inside <Modal darkHeader>.
 *
 * Mobile (< 768px):
 *   Renders <ModalBottomSheet> — snap points: half → full.
 *   Свайп фона заблокирован через overlay + body.touchAction = 'none'.
 *
 * Usage (same API for both):
 *   <Modal open={open} onClose={onClose} darkHeader width="680px">
 *     <TrinityModalShell icon={<UserPlus/>} title="Новый клиент" open={open} onClose={onClose}>
 *       {formContent}
 *     </TrinityModalShell>
 *   </Modal>
 */

import { ReactNode, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ModalBottomSheet } from './ModalBottomSheet'

interface TrinityModalShellProps {
  /** open/onClose — нужны для мобильного ModalBottomSheet */
  open: boolean
  onClose: () => void
  /** Иконка в сайдбаре / шапке */
  icon: ReactNode
  /** Заголовок */
  title: string
  /** Подзаголовок */
  subtitle?: string
  /** Цвет акцента (icon circle) — defaults to var(--trinity-accent) */
  accentColor?: string
  /** Фон сайдбара — defaults to var(--trinity-sidebar-bg) */
  sidebarBg?: string
  /** Контент формы */
  children: ReactNode
  /** Доп. контент в сайдбаре (только десктоп) */
  sidebarExtra?: ReactNode
  /** Кнопки действий — sticky footer на мобиле, inline на десктопе */
  footerContent?: ReactNode
  /** RTL / LTR */
  dir?: 'rtl' | 'ltr'
}

export function TrinityModalShell({
  open,
  onClose,
  icon,
  title,
  subtitle,
  accentColor,
  sidebarBg,
  children,
  sidebarExtra,
  footerContent,
  dir = 'ltr',
}: TrinityModalShellProps) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const sidebar = sidebarBg   || 'var(--trinity-sidebar-bg, #1e2533)'
  const accent  = accentColor || 'var(--trinity-accent, #4a6fa5)'

  // ── Mobile: ModalBottomSheet renders itself via portal — bypasses parent <Modal> ──
  // We render a sentinel div that hides the parent Modal's backdrop+container on mobile,
  // plus the ModalBottomSheet itself as a portal.
  if (mounted && isMobile) {
    return (
      <>
        {/* Inject scoped CSS to hide the wrapping Modal's backdrop and container on mobile */}
        <style>{`
          @media (max-width: 767px) {
            [data-trinity-modal-wrapper] {
              display: none !important;
            }
            [data-trinity-modal-backdrop] {
              display: none !important;
            }
          }
        `}</style>
        <ModalBottomSheet
          open={open}
          onClose={onClose}
          icon={icon}
          title={title}
          subtitle={subtitle}
          sidebarBg={sidebar}
          accentColor={accent}
          footerContent={footerContent ?? sidebarExtra}
          dir={dir}
        >
          {children}
        </ModalBottomSheet>
      </>
    )
  }

  // ── Desktop: sidebar grid layout ──────────────────────────────────────────
  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: '176px minmax(0, 1fr)',
        minHeight:           420,
        maxHeight:           '85vh',
        overflow:            'visible',   // НЕ hidden — иначе дропдауны (ClientSearch) обрезаются
        overflowWrap:        'break-word',
      }}
      dir={dir}
    >
      {/* Sidebar */}
      <div
        style={{
          background:     sidebar,
          paddingBlock:   '28px 20px',
          paddingInline:  16,
          display:        'flex',
          flexDirection:  'column',
          gap:            0,
          borderRadius:   dir === 'rtl' ? '0 16px 16px 0' : '16px 0 0 16px',
          minWidth:       0,
          overflow:       'hidden',
          position:       'sticky',
          top:            0,
          alignSelf:      'stretch',
          flexShrink:     0,
        }}
      >
        {/* Close button — top-left of sidebar */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position:        'absolute',
            top:             10,
            left:            10,
            width:           28,
            height:          28,
            borderRadius:    '50%',
            border:          'none',
            background:      'rgba(255,255,255,0.12)',
            color:           'rgba(255,255,255,0.7)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            cursor:          'pointer',
            transition:      'background 0.15s, color 0.15s',
            flexShrink:      0,
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'
          }}
        >
          <X size={14} />
        </button>
        {/* Icon circle */}
        <div
          style={{
            width:          52, height: 52, borderRadius: '50%',
            background:     accent,
            display:        'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom:   14, flexShrink: 0, color: '#fff',
          }}
        >
          <span style={{ display: 'flex', width: 24, height: 24 }}>{icon}</span>
        </div>

        {/* Title */}
        <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px', lineHeight: 1.3 }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}

        {sidebarExtra && (
          <>
            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
            {sidebarExtra}
          </>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          background:    'var(--trinity-content-bg, #f8f9fc)',
          paddingBlock:  '28px 20px',
          paddingInline: 20,
          overflowY:     'auto',
          minWidth:      0,
          borderRadius:  dir === 'rtl' ? '16px 0 0 16px' : '0 16px 16px 0',
          display:       'flex',
          flexDirection: 'column',
          maxHeight:     '85vh',
        }}
      >
        <div style={{ flex: 1 }}>{children}</div>
        {footerContent && (
          <div style={{
            display:    'flex',
            gap:        10,
            paddingTop: 16,
            marginTop:  8,
            borderTop:  '1px solid rgba(0,0,0,0.07)',
          }}>
            {footerContent}
          </div>
        )}
      </div>
    </div>
  )
}
