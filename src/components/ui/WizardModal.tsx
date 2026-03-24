'use client'

import { ReactNode, useEffect, useState } from 'react'
import { LucideIcon, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'

export interface WizardStep {
  label: string
  icon: LucideIcon
}

export interface WizardModalProps {
  open: boolean
  onClose: () => void
  title: string
  logoLabel?: string
  logoBadge?: string
  /** Иконка в кружке над заголовком (как у TrinityModalShell) */
  headerIcon?: ReactNode
  steps: WizardStep[]
  currentStep: number
  onNext: () => void
  onBack: () => void
  canProceed: boolean
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel?: string
  cancelLabel?: string
  backLabel?: string
  nextLabel?: string
  dir?: 'rtl' | 'ltr'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

const SIZE_MAP: Record<string, string> = {
  sm:  'clamp(380px, 85vw, 520px)',
  md:  'clamp(420px, 85vw, 680px)',
  lg:  'clamp(460px, 85vw, 820px)',
  xl:  'clamp(480px, 85vw, 960px)',
}

// ── Vertical step list in sidebar ──────────────────────────────────────────
function SidebarSteps({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((step, idx) => {
        const id = idx + 1
        const isDone = id < current
        const isActive = id === current
        const Icon = step.icon
        return (
          <div key={id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 10,
              background: isActive ? 'var(--trinity-accent-bg, rgba(74,111,165,0.25))' : 'transparent',
              transition: 'background 0.2s',
            }}>
              {/* Icon circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone
                  ? 'rgba(255,255,255,0.15)'
                  : isActive
                  ? 'var(--trinity-accent, #4a6fa5)'
                  : 'rgba(255,255,255,0.06)',
                border: isActive ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
              }}>
                {isDone
                  ? <CheckCircle2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} />
                  : <Icon style={{ width: 14, height: 14, color: isActive ? '#fff' : 'rgba(255,255,255,0.35)' }} />
                }
              </div>
              {/* Label */}
              <span style={{
                fontSize: 12, fontWeight: isActive ? 600 : 400, lineHeight: 1.3,
                color: isActive
                  ? 'var(--trinity-accent-text, #7aa8e0)'
                  : isDone
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.3)',
              }}>
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div style={{
                width: 1.5, height: 16, marginLeft: 25,
                background: idx < current - 1
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(255,255,255,0.1)',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Dot progress ─────────────────────────────────────────────────────────────
function DotProgress({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i}
          style={{
            borderRadius: 999, transition: 'all 0.3s',
            width: i + 1 === current ? 20 : 8,
            height: 8,
            background: i + 1 === current
              ? 'var(--trinity-accent, #4a6fa5)'
              : i + 1 < current
              ? 'rgba(100,200,120,0.7)'
              : 'rgba(0,0,0,0.12)',
          }}
        />
      ))}
    </div>
  )
}

export function WizardModal({
  open, onClose, title, logoLabel = 'Trinity CRM', logoBadge, headerIcon,
  steps, currentStep, onNext, onBack, canProceed,
  onSubmit, isSubmitting = false,
  submitLabel = 'Создать', cancelLabel = 'Отмена', backLabel = 'Назад', nextLabel = 'Далее',
  dir = 'rtl', size = 'md', children,
}: WizardModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open || !mounted) return null
  const isLastStep = currentStep === steps.length

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8999]"
        onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        dir={dir}
        role="dialog"
        aria-modal="true"
        className="fixed z-[9000] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 max-h-[calc(100dvh-32px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '95%',
          maxWidth: SIZE_MAP[size] || SIZE_MAP.md,
          marginInline: 'auto',
          overflowWrap: 'break-word',
          // Sidebar layout: dark left + white right
          display: 'grid',
          gridTemplateColumns: '168px minmax(0, 1fr)',
          gridTemplateRows: '1fr auto',
        }}
      >

        {/* ── Sidebar (col 1, rows 1+2) ── */}
        <div
          style={{
            gridColumn: 1,
            gridRow: '1 / 3',
            background: 'var(--trinity-sidebar-bg, #1e2533)',
            paddingBlock: '24px 20px',
            paddingInline: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            minWidth: 0,
            overflow: 'hidden',
            borderRadius: dir === 'rtl' ? '0 16px 16px 0' : '16px 0 0 16px',
          }}
        >
          {/* Header icon — как у TrinityModalShell, сразу сверху */}
          {headerIcon && (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--trinity-accent, #4a6fa5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, color: '#fff', flexShrink: 0,
            }}>
              <span style={{ display: 'flex', width: 24, height: 24 }}>{headerIcon}</span>
            </div>
          )}

          {/* Title */}
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 18px', lineHeight: 1.3 }}>
            {title}
          </p>
          {/* Vertical steps */}
          <SidebarSteps steps={steps} current={currentStep} />
        </div>

        {/* ── Content area (col 2, row 1) ── */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 1,
            background: 'var(--trinity-content-bg, #f8f9fc)',
            paddingBlock: '20px 12px',
            paddingInline: 20,
            overflowY: 'auto',
            minWidth: 0,
            minHeight: 320,
            borderRadius: dir === 'rtl' ? '16px 0 0 0' : '0 16px 0 0',
            position: 'relative',
          }}
        >
          {/* Close button — floating top corner */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12,
              [dir === 'rtl' ? 'left' : 'right']: 12,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.07)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10,
            }}
          >
            <X style={{ width: 14, height: 14, color: '#666' }} />
          </button>

          {children}
        </div>

        {/* ── Footer (col 2, row 2) ── */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 2,
            background: 'var(--trinity-content-bg, #f8f9fc)',
            paddingBlock: '12px 16px',
            paddingInline: 20,
            borderTop: '0.5px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: dir === 'rtl' ? '0 0 0 16px' : '0 0 16px 0',
            minWidth: 0,
          }}
        >
          <Button variant="ghost"
            onClick={currentStep === 1 ? onClose : onBack}
            className="text-gray-500 hover:text-gray-700 text-sm">
            {currentStep === 1 ? cancelLabel : backLabel}
          </Button>

          <DotProgress total={steps.length} current={currentStep} />

          {isLastStep ? (
            <Button
              onClick={onSubmit}
              disabled={!canProceed || isSubmitting}
              className="gap-2 min-w-[110px] text-white text-sm"
              style={{ background: 'var(--trinity-accent, #4a6fa5)' }}
            >
              {isSubmitting
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>...</>
                : <><CheckCircle2 className="w-3.5 h-3.5" />{submitLabel}</>}
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="text-white text-sm"
              style={{ background: 'var(--trinity-accent, #4a6fa5)' }}
            >
              {nextLabel}
            </Button>
          )}
        </div>

      </div>
    </>,
    document.body
  )
}

export default WizardModal
