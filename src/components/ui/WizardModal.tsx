'use client'

/**
 * WizardModal — Trinity CRM reusable multi-step wizard shell
 *
 * Usage:
 *   <WizardModal
 *     open={open}
 *     onClose={onClose}
 *     title="Название окна"
 *     steps={[{ label: 'Шаг 1', icon: SomeIcon }, ...]}
 *     currentStep={step}
 *     onNext={goNext}
 *     onBack={goPrev}
 *     canProceed={isValid}
 *     onSubmit={handleSubmit}
 *     isSubmitting={isPending}
 *     submitLabel="Создать"
 *     headerIcon={<Megaphone className="w-5 h-5" />}
 *     size="md"
 *     dir="rtl"
 *   >
 *     {stepContent}
 *   </WizardModal>
 */

import { ReactNode, useEffect, useState } from 'react'
import { LucideIcon, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardStep {
  label: string
  icon: LucideIcon
}

export interface WizardModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  steps: WizardStep[]
  currentStep: number            // 1-based
  onNext: () => void
  onBack: () => void
  canProceed: boolean
  onSubmit: () => void
  isSubmitting?: boolean
  children: ReactNode
  headerIcon?: ReactNode         // icon shown left of title in header
  submitLabel?: string           // default: "Создать"
  backLabel?: string             // default: "Назад"
  nextLabel?: string             // default: "Далее"
  cancelLabel?: string           // default: "Отмена"
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dir?: 'rtl' | 'ltr'
  minContentHeight?: string      // default: '280px'
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4 pb-1">
      {steps.map((step, idx) => {
        const id = idx + 1
        const isActive = id === current
        const isDone = id < current
        const Icon = step.icon
        return (
          <div key={id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                isDone
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/40'
                  : isActive
                  ? 'bg-white/25 border-2 border-white shadow-md'
                  : 'bg-white/10 border border-white/30'
              )}>
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : <Icon className="w-4 h-4 text-white" />
                }
              </div>
              <span className={cn(
                'text-[10px] font-medium whitespace-nowrap transition-opacity duration-200',
                isActive ? 'text-white opacity-100' : 'text-white/55'
              )}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                'w-10 h-0.5 mb-5 rounded-full transition-all duration-500',
                isDone ? 'bg-white/65' : 'bg-white/20'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Dot Progress ─────────────────────────────────────────────────────────────

function DotProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          'rounded-full transition-all duration-300',
          i + 1 === current ? 'w-5 h-2 bg-indigo-600'
          : i + 1 < current ? 'w-2 h-2 bg-emerald-400'
          : 'w-2 h-2 bg-gray-200'
        )} />
      ))}
    </div>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function WizardModal({
  open,
  onClose,
  title,
  subtitle,
  steps,
  currentStep,
  onNext,
  onBack,
  canProceed,
  onSubmit,
  isSubmitting = false,
  children,
  headerIcon,
  submitLabel = 'Создать',
  backLabel = 'Назад',
  nextLabel = 'Далее',
  cancelLabel = 'Отмена',
  size = 'md',
  dir = 'rtl',
  minContentHeight = '280px',
}: WizardModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const isLastStep = currentStep === steps.length

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8999] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        dir={dir}
        className={cn(
          'fixed z-[9000] w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[calc(100dvh-32px)]',
          SIZE_MAP[size],
          // Center on screen
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        )}
      >
        {/* ── Gradient Header (same style as onboarding) ── */}
        <div className="bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#1565c0] px-6 pt-5 pb-4 flex-shrink-0">
          {/* Title row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {headerIcon && (
                <span className="text-white/80">{headerIcon}</span>
              )}
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
                {subtitle && (
                  <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-colors -mt-1 -mr-1 flex-shrink-0"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {/* Step indicator */}
          <StepIndicator steps={steps} current={currentStep} />
        </div>

        {/* ── Content area ── */}
        <div
          className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 px-6 py-5"
          style={{ minHeight: minContentHeight }}
        >
          {children}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {/* Left: cancel / back */}
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? onClose : onBack}
            className="text-gray-500 hover:text-gray-700 gap-1"
          >
            {currentStep === 1 ? cancelLabel : (
              <>
                <ChevronRight className="w-4 h-4" />
                {backLabel}
              </>
            )}
          </Button>

          {/* Center: dot progress */}
          <DotProgress total={steps.length} current={currentStep} />

          {/* Right: next / submit */}
          {!isLastStep ? (
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1"
            >
              {nextLabel}
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={!canProceed || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px] gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

export default WizardModal
