'use client'

import { ReactNode, useEffect, useRef, useCallback, useState } from 'react'
import { LucideIcon, CheckCircle2, X } from 'lucide-react'
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
  /** Иконка в кружке над заголовком */
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
  sm: 'clamp(380px, 85vw, 520px)',
  md: 'clamp(420px, 85vw, 680px)',
  lg: 'clamp(460px, 85vw, 820px)',
  xl: 'clamp(480px, 85vw, 960px)',
}

// ── Vertical step list (desktop sidebar) ─────────────────────────────────────
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
              <span style={{
                fontSize: 12, fontWeight: isActive ? 600 : 400, lineHeight: 1.3,
                color: isActive
                  ? 'var(--trinity-accent-text, #7aa8e0)'
                  : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
              }}>
                {step.label}
              </span>
            </div>
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

// ── Dot progress (desktop footer) ─────────────────────────────────────────────
function DotProgress({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          borderRadius: 999, transition: 'all 0.3s',
          width: i + 1 === current ? 20 : 8,
          height: 8,
          background: i + 1 === current
            ? 'var(--trinity-accent, #4a6fa5)'
            : i + 1 < current
            ? 'rgba(100,200,120,0.7)'
            : 'rgba(0,0,0,0.12)',
        }} />
      ))}
    </div>
  )
}

// ── Mobile bottom-sheet wizard ────────────────────────────────────────────────
function WizardBottomSheet({
  open, onClose, title, headerIcon, steps, currentStep, dir,
  onNext, onBack, canProceed, onSubmit, isSubmitting,
  submitLabel, cancelLabel, backLabel, nextLabel, children,
}: WizardModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      setAnimating(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true
    touchStartY.current = e.touches[0].clientY
    setAnimating(false)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - touchStartY.current
    setDragOffset(Math.max(0, delta))
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

  const isLastStep = currentStep === steps.length
  const translateY = !visible ? '100%' : `${dragOffset}px`
  const transition = animating
    ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    : 'none'

  if (!mounted || !open) return null

  const accent = 'var(--trinity-accent, #4a6fa5)'
  const sidebarBg = 'var(--trinity-sidebar-bg, #1e2533)'

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9990, touchAction: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
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
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '92vh',
          maxHeight: 'calc(100dvh - env(safe-area-inset-bottom, 0px))',
          zIndex: 9999,
          transform: `translateY(${translateY})`,
          transition,
          borderRadius: '18px 18px 0 0',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          willChange: 'transform', touchAction: 'none',
          background: 'var(--trinity-content-bg, #f8f9fc)',
        }}
      >
        {/* ── Drag pill + header ── */}
        <div
          style={{ background: sidebarBg, flexShrink: 0, cursor: 'grab' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 10px' }}>
            {headerIcon && (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#fff',
              }}>
                <span style={{ display: 'flex', width: 18, height: 18 }}>{headerIcon}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                {title}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {steps[currentStep - 1]?.label}
              </p>
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
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {/* Step progress bars */}
          <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                flex: i + 1 === currentStep ? 2 : 1,
                height: 3, borderRadius: 2,
                background: i + 1 < currentStep
                  ? 'rgba(100,200,120,0.7)'
                  : i + 1 === currentStep
                  ? '#fff'
                  : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          padding: '20px 16px 8px',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {children}
        </div>

        {/* ── Sticky footer с кнопками ── */}
        <div style={{
          flexShrink: 0,
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          background: 'var(--trinity-content-bg, #f8f9fc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? onClose : onBack}
            style={{ color: '#64748b', fontSize: 14, minWidth: 80 }}
          >
            {currentStep === 1 ? cancelLabel : backLabel}
          </Button>

          <DotProgress total={steps.length} current={currentStep} />

          {isLastStep ? (
            <Button
              onClick={onSubmit}
              disabled={!canProceed || isSubmitting}
              style={{
                background: canProceed && !isSubmitting ? accent : '#e2e8f0',
                color: canProceed && !isSubmitting ? '#fff' : '#94a3b8',
                fontSize: 14, minWidth: 110,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {isSubmitting
                ? <><div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />...</>
                : <><CheckCircle2 style={{ width: 14, height: 14 }} />{submitLabel}</>}
            </Button>
          ) : (
            <Button
              onClick={onNext}
              disabled={!canProceed}
              style={{
                background: canProceed ? accent : '#e2e8f0',
                color: canProceed ? '#fff' : '#94a3b8',
                fontSize: 14, minWidth: 90,
              }}
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

// ── Main export: desktop grid + mobile bottom-sheet ───────────────────────────
export function WizardModal(props: WizardModalProps) {
  const {
    open, onClose, title, logoLabel = 'Trinity CRM', logoBadge, headerIcon,
    steps, currentStep, onNext, onBack, canProceed,
    onSubmit, isSubmitting = false,
    submitLabel = 'Создать', cancelLabel = 'Отмена', backLabel = 'Назад', nextLabel = 'Далее',
    dir = 'rtl', size = 'md', children,
  } = props

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

  // Desktop: lock scroll + Escape
  useEffect(() => {
    if (!open || (mounted && isMobile)) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, mounted, isMobile])

  if (!mounted || !open) return null

  // Mobile → bottom sheet
  if (isMobile) {
    return <WizardBottomSheet {...props} />
  }

  // Desktop → grid layout
  const isLastStep = currentStep === steps.length

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8999]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        dir={dir}
        role="dialog"
        aria-modal="true"
        className="fixed z-[9000] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 max-h-[calc(100dvh-32px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '95%',
          maxWidth: SIZE_MAP[size] || SIZE_MAP.md,
          overflowWrap: 'break-word',
          display: 'grid',
          gridTemplateColumns: '168px minmax(0, 1fr)',
          gridTemplateRows: '1fr auto',
        }}
      >
        {/* ── Sidebar (col 1, rows 1+2) ── */}
        <div style={{
          gridColumn: 1, gridRow: '1 / 3',
          background: 'var(--trinity-sidebar-bg, #1e2533)',
          paddingBlock: '24px 20px', paddingInline: 14,
          display: 'flex', flexDirection: 'column',
          minWidth: 0, overflow: 'hidden',
          borderRadius: dir === 'rtl' ? '0 16px 16px 0' : '16px 0 0 16px',
        }}>
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
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 18px', lineHeight: 1.3 }}>
            {title}
          </p>
          <SidebarSteps steps={steps} current={currentStep} />
        </div>

        {/* ── Content area (col 2, row 1) ── */}
        <div style={{
          gridColumn: 2, gridRow: 1,
          background: 'var(--trinity-content-bg, #f8f9fc)',
          paddingBlock: '20px 12px', paddingInline: 20,
          overflowY: 'auto',
          minWidth: 0, minHeight: 320,
          borderRadius: dir === 'rtl' ? '16px 0 0 0' : '0 16px 0 0',
          position: 'relative',
        }}>
          {/* Close button */}
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
        <div style={{
          gridColumn: 2, gridRow: 2,
          background: 'var(--trinity-content-bg, #f8f9fc)',
          paddingBlock: '12px 16px', paddingInline: 20,
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: dir === 'rtl' ? '0 0 0 16px' : '0 0 16px 0',
          minWidth: 0,
        }}>
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? onClose : onBack}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
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
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />...</>
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
