'use client'

/**
 * TrinityModalShell — canonical sidebar-layout shell for Trinity modals.
 * Renders a dark sidebar (themed) on the left and white content on the right.
 * Use inside any Modal with darkHeader={true}.
 *
 * Usage:
 *   <Modal open={open} onClose={onClose} darkHeader width="680px">
 *     <TrinityModalShell icon={<UserPlus/>} title="Новый клиент" accentColor="#4a6fa5">
 *       {formContent}
 *     </TrinityModalShell>
 *   </Modal>
 */

import { ReactNode } from 'react'

interface TrinityModalShellProps {
  /** Icon shown in sidebar header (lucide or any ReactNode) */
  icon: ReactNode
  /** Title shown in sidebar */
  title: string
  /** Optional subtitle / description below title */
  subtitle?: string
  /** Accent color — defaults to CSS var --trinity-accent */
  accentColor?: string
  /** Sidebar background — defaults to CSS var --trinity-sidebar-bg */
  sidebarBg?: string
  /** Content area */
  children: ReactNode
  /** Optional extra items in sidebar below header */
  sidebarExtra?: ReactNode
  /** RTL support */
  dir?: 'rtl' | 'ltr'
}

export function TrinityModalShell({
  icon,
  title,
  subtitle,
  accentColor,
  sidebarBg,
  children,
  sidebarExtra,
  dir = 'ltr',
}: TrinityModalShellProps) {
  const sidebar = sidebarBg || 'var(--trinity-sidebar-bg, #1e2533)'
  const accent = accentColor || 'var(--trinity-accent, #4a6fa5)'

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '176px 1fr', minHeight: 420 }}
      dir={dir}
    >
      {/* ── Sidebar ── */}
      <div
        style={{
          background: sidebar,
          padding: '28px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          borderRadius: dir === 'rtl' ? '0 16px 16px 0' : '16px 0 0 16px',
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, flexShrink: 0,
            color: '#fff',
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

        {/* Divider */}
        {sidebarExtra && (
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
        )}

        {/* Extra sidebar content */}
        {sidebarExtra}
      </div>

      {/* ── Content ── */}
      <div
        style={{
          background: 'var(--trinity-content-bg, #f8f9fc)',
          padding: '28px 20px 20px',
          overflowY: 'auto',
          borderRadius: dir === 'rtl' ? '16px 0 0 16px' : '0 16px 16px 0',
        }}
      >
        {children}
      </div>
    </div>
  )
}
