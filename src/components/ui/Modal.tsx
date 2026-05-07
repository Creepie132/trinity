'use client'

import { useEffect, useCallback, ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraggableDialog } from '@/hooks/useDraggableDialog'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  headerActions?: ReactNode
  width?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  className?: string
  contentClassName?: string
  dir?: 'rtl' | 'ltr'
  modalId?: string
  /** @deprecated — pin-функционал удалён, проп игнорируется */
  pinTitle?: string
  zIndexOverride?: number
  /**
   * When true: drag handle becomes a transparent overlay (no white bar).
   * Use when children start with a dark/colored header (e.g. TrinityModalShell).
   */
  darkHeader?: boolean
}

const sizeMap: Record<string, string> = {
  sm:   'clamp(320px, 90vw, 384px)',
  md:   'clamp(320px, 90vw, 448px)',
  lg:   'clamp(320px, 85vw, 512px)',
  xl:   'clamp(320px, 85vw, 576px)',
  full: 'clamp(320px, 80vw, 896px)',
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerActions,
  width,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  contentClassName,
  dir = 'rtl',
  darkHeader = false,
  zIndexOverride,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { containerRef, handleRef, resetPosition } = useDraggableDialog()

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape' && closeOnEscape) onClose() },
    [closeOnEscape, onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  useEffect(() => {
    if (!open) resetPosition()
  }, [open])

  if (!open) return null
  if (!mounted) return null

  const zIndex   = zIndexOverride ?? 9000
  const maxWidth = width ? `clamp(320px, ${width}, calc(100vw - 32px))` : (sizeMap[size] ?? sizeMap.md)

  // ── Close button style ────────────────────────────────────────────────────
  // position: absolute inside modal container.
  // Тёмный фон (#3d4a5c) — хорошо виден и над тёмным sidebar, и над светлым content.
  // RTL → top-left; LTR → top-right.
  const closeBtnStyle: React.CSSProperties = {
    position:        'absolute',
    top:             10,
    zIndex:          30,
    width:           32,
    height:          32,
    borderRadius:    '50%',
    background:      '#3d4a5c',
    border:          '2px solid rgba(255,255,255,0.18)',
    color:           '#fff',
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       '0 2px 10px rgba(0,0,0,0.4)',
    transition:      'transform 0.15s, background 0.15s',
    pointerEvents:   'auto',
    ...(dir === 'rtl' ? { left: 10, right: 'auto' } : { right: 10, left: 'auto' }),
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: zIndexOverride ? zIndexOverride - 1 : 8999 }}
        data-trinity-modal-backdrop=""
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        ref={containerRef}
        data-trinity-modal-wrapper=""
        className={cn(
          'fixed bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto flex flex-col',
          'animate-in fade-in-0 duration-200',
          'rounded-2xl',
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'max-h-[92dvh] md:max-h-[calc(100dvh-32px)]',
          className
        )}
        data-desktop="true"
        style={{
          zIndex,
          width:        '95%',
          maxWidth,
          marginInline: 'auto',
          overflowWrap: 'break-word',
          overflow:     'visible',
          position:     'fixed',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        dir={dir}
      >
        {darkHeader ? (
          /* ── Dark header mode (TrinityModalShell) ── */
          <div
            className="relative flex-1 flex flex-col min-h-0 rounded-2xl"
            style={{ overflow: 'hidden' }}
          >
            {/* Drag handle — desktop only */}
            <div
              ref={handleRef}
              className="hidden md:block absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing select-none z-10"
              style={{ background: 'transparent' }}
            />
            {/* headerActions (если есть) */}
            {headerActions && (
              <div
                className="absolute top-2.5 z-20 flex items-center gap-0.5"
                style={{ [dir === 'rtl' ? 'left' : 'right']: '10px' }}
              >
                {headerActions}
              </div>
            )}
            <div className={cn('flex-1 overflow-y-auto', contentClassName)}>
              {children}
            </div>
          </div>
        ) : (
          /* ── Normal (light) mode ── */
          <>
            <div
              ref={handleRef}
              className="hidden md:flex items-center justify-center h-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <GripHorizontal className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            {title && (
              <div className="flex items-start justify-between px-5 pb-0 pt-1">
                <div className="flex-1 min-w-0 pt-1">
                  <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {title}
                  </h2>
                  {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
                {headerActions && (
                  <div className="flex items-center gap-1 -mt-1 -me-1">{headerActions}</div>
                )}
              </div>
            )}
            <div
              className={cn('flex-1 overflow-y-auto p-5', footer && 'pb-3', contentClassName)}
              style={{ overflow: 'hidden auto' }}
            >
              {children}
            </div>
          </>
        )}

        {footer && (
          <div className="flex-shrink-0 p-5 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
            {footer}
          </div>
        )}

        {/* ── Close button — desktop only, always visible ───────────────────
            RTL → top-left; LTR → top-right.
            Тёмный фон виден и над тёмным sidebar, и над светлым content.
        ──────────────────────────────────────────────────────────────────── */}
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="hidden md:flex"
            style={closeBtnStyle}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.transform  = 'scale(1.12)'
              b.style.background = '#2c3a4a'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.transform  = 'scale(1)'
              b.style.background = '#3d4a5c'
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </>,
    document.body
  )
}

export default Modal
