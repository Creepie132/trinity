'use client'

import { useEffect, useCallback, ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, GripHorizontal, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraggableDialog } from '@/hooks/useDraggableDialog'
import { usePinnedModals } from '@/store/usePinnedModals'

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
  pinTitle?: string
  zIndexOverride?: number
  /**
   * When true: drag handle becomes a transparent overlay (no white bar),
   * close/pin buttons float over the content as white icons.
   * Use when children start with a dark/colored header.
   */
  darkHeader?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

let idCounter = 0

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
  modalId: modalIdProp,
  pinTitle,
  darkHeader = false,
  zIndexOverride,
}: ModalProps) {
  const idRef = useRef<string>(modalIdProp || `modal-${++idCounter}`)
  const modalId = idRef.current

  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { pin, unpin, isPinned, bringToFront, pinned, maxPinned } = usePinnedModals()
  const pinned_ = isPinned(modalId)
  const { containerRef, handleRef, resetPosition, getCurrentPosition } = useDraggableDialog()

  const pinnedData = pinned.find(p => p.id === modalId)

  useEffect(() => {
    if (pinnedData && containerRef.current) {
      const left = window.innerWidth / 2 + pinnedData.x
      const top = window.innerHeight / 2 + pinnedData.y
      containerRef.current.style.left = `${left}px`
      containerRef.current.style.top = `${top}px`
      containerRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [pinned_])

  const handlePin = useCallback(() => {
    if (pinned_) {
      unpin(modalId)
    } else {
      const pos = getCurrentPosition()
      const canPin = pin({
        id: modalId,
        title: (typeof pinTitle === 'string' ? pinTitle : typeof title === 'string' ? title : 'Окно'),
        x: pos.x,
        y: pos.y,
        zIndex: 9100,
      })
      if (!canPin && containerRef.current) {
        containerRef.current.classList.add('animate-shake')
        setTimeout(() => containerRef.current?.classList.remove('animate-shake'), 500)
      }
    }
  }, [pinned_, pin, unpin, modalId, title, pinTitle, getCurrentPosition])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape' && closeOnEscape && !pinned_) onClose() },
    [closeOnEscape, onClose, pinned_]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      if (!pinned_) document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape, pinned_])

  useEffect(() => {
    if (!open && !pinned_) resetPosition()
  }, [open])

  if (!open && !pinned_) return null
  if (!mounted) return null

  const zIndex = zIndexOverride ?? (pinnedData ? pinnedData.zIndex : 9000)

  return createPortal(
    <>
      {/* Backdrop */}
      {!pinned_ && (
        <div
          className="fixed inset-0 bg-black/50"
          style={{ zIndex: zIndexOverride ? zIndexOverride - 1 : 8999 }}
          data-trinity-modal-backdrop=""
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Modal container */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalId)}
        data-trinity-modal-wrapper=""
        className={cn(
          'fixed bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto flex flex-col',
          'animate-in fade-in-0 duration-200',
          'rounded-2xl overflow-hidden',
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'max-h-[92dvh] md:max-h-[calc(100dvh-32px)]',
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        data-desktop={isDesktop ? 'true' : undefined}
        style={{
          zIndex,
          // Фиксированная ширина — контент не диктует размер контейнера
          width: '95%',
          maxWidth: width
            ? `clamp(320px, ${width}, calc(100vw - 32px))`
            : sizeClasses[size] === 'max-w-sm'  ? 'clamp(320px, 90vw, 384px)'
            : sizeClasses[size] === 'max-w-md'  ? 'clamp(320px, 90vw, 448px)'
            : sizeClasses[size] === 'max-w-lg'  ? 'clamp(320px, 85vw, 512px)'
            : sizeClasses[size] === 'max-w-xl'  ? 'clamp(320px, 85vw, 576px)'
            : 'clamp(320px, 80vw, 896px)',
          marginInline: 'auto',
          overflowWrap: 'break-word',
        }}
        role="dialog"
        aria-modal={!pinned_}
        aria-labelledby={title ? 'modal-title' : undefined}
        dir={dir}
      >
        {darkHeader ? (
          /* ── Dark header mode ────────────────────────────────────────────
             Drag handle is a transparent zone over the dark header.
             Close/Pin buttons float as white icons in the top corner.
          ─────────────────────────────────────────────────────────────── */
          <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl">
            {/* Transparent drag zone — sits over the dark header */}
            <div
              ref={handleRef}
              className="hidden md:block absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing select-none z-10"
              style={{ background: 'transparent' }}
            />
            {/* Floating close / pin — white icons, top corner */}
            <div
              className="absolute top-2.5 z-20 flex items-center gap-0.5"
              style={{ [dir === 'rtl' ? 'left' : 'right']: '10px' }}
            >
              {headerActions && (
                <div className="flex items-center gap-0.5 me-0.5">{headerActions}</div>
              )}
              <button
                onClick={handlePin}
                title={pinned_ ? 'Открепить' : 'Закрепить'}
                className={cn(
                  'hidden md:flex p-1.5 rounded-full transition-colors',
                  pinned_
                    ? 'bg-orange-400/30 text-orange-200 hover:bg-orange-400/50'
                    : 'text-white/40 hover:text-white/90 hover:bg-white/20'
                )}
              >
                {pinned_ ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Scrollable content */}
            <div className={cn('flex-1 overflow-y-auto', contentClassName)}>
              {children}
            </div>
          </div>
        ) : (
          /* ── Normal (light) mode ─────────────────────────────────────── */
          <>
            {/* Drag handle */}
            <div
              ref={handleRef}
              className="hidden md:flex items-center justify-center h-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <GripHorizontal className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>

            {/* Title header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-5 pb-0 pt-1">
                <div className="flex-1 min-w-0 pt-1">
                  {title && (
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-1 -mt-1 -mr-1">
                  <button
                    onClick={handlePin}
                    title={pinned_ ? 'Открепить' : (pinned.length >= maxPinned ? 'Максимум 3 окна' : 'Закрепить')}
                    className={cn(
                      'hidden md:flex p-1.5 rounded-full transition-colors',
                      pinned_
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 hover:bg-orange-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 hover:text-gray-500'
                    )}
                  >
                    {pinned_ ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  {showCloseButton && (
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className={cn('flex-1 overflow-y-auto p-5', footer && 'pb-3', contentClassName)}>
              {children}
            </div>
          </>
        )}

        {/* Footer — always outside the dark/normal split */}
        {footer && (
          <div className="flex-shrink-0 p-5 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

export default Modal
