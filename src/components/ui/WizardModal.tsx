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

const SIZE_MAP = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

function StepIndicator({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const id = idx + 1
        const isActive = id === current
        const isDone = id < current
        const Icon = step.icon
        return (
          <div key={id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                isDone ? 'bg-white/20 border-white/60' : isActive ? 'bg-white/25 border-white shadow-lg' : 'bg-white/5 border-white/20',
              )}>
                {isDone ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-white/40')} />}
              </div>
              <span className={cn('text-[10px] font-medium tracking-wide whitespace-nowrap', isActive ? 'text-white opacity-100' : isDone ? 'text-white/70' : 'text-white/35')}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('w-10 h-0.5 mb-5 mx-1 rounded-full transition-all duration-500', isDone ? 'bg-white/60' : 'bg-white/15')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DotProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('rounded-full transition-all duration-300',
          i + 1 === current ? 'w-5 h-2 bg-indigo-600' : i + 1 < current ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-gray-200')} />
      ))}
    </div>
  )
}

export function WizardModal({
  open, onClose, title, logoLabel = 'Trinity CRM', logoBadge,
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8999]" onClick={onClose} aria-hidden="true" />
      <div dir={dir} role="dialog" aria-modal="true"
        className={cn(
          'fixed z-[9000] w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'max-h-[calc(100dvh-32px)]',
          SIZE_MAP[size],
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}>

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#3949ab] px-5 pt-4 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <polygon points="8,1.5 13.5,4.75 13.5,11.25 8,14.5 2.5,11.25 2.5,4.75" fill="none" stroke="rgba(255,200,80,0.8)" strokeWidth="1.2"/>
                  <circle cx="8" cy="8" r="3" fill="rgba(255,180,0,0.7)"/>
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-sm">{logoLabel}</span>
                {logoBadge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {logoBadge}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <h2 className="text-white text-lg font-bold mb-4">{title}</h2>
          <StepIndicator steps={steps} current={currentStep} />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 px-6 py-5">
          {children}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <Button variant="ghost" onClick={currentStep === 1 ? onClose : onBack} className="text-gray-500 hover:text-gray-700">
            {currentStep === 1 ? cancelLabel : backLabel}
          </Button>
          <DotProgress total={steps.length} current={currentStep} />
          {isLastStep ? (
            <Button onClick={onSubmit} disabled={!canProceed || isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 min-w-[120px]">
              {isSubmitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</>
                : <><CheckCircle2 className="w-4 h-4" />{submitLabel}</>}
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!canProceed} className="bg-indigo-600 hover:bg-indigo-700">
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
