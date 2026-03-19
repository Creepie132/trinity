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
}: ModalProps) {
  const idRef = useRef<string>(modalIdProp || `modal-${++idCounter}`)
  const modalId = idRef.current

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { pin, unpin, isPinned, bringToFront, pinned, maxPinned } = usePinnedModals()
  const pinned_ = isPinned(modalId)
  const { containerRef, handleRef, resetPosition, getCurrentPosition } = useDraggableDialog()

  const pinnedData = pinned.find(p => p.id === modalId)

  // Восстанавливаем позицию из store при монтировании закреплённого окна
  // pinnedData.x/y — смещение от центра viewport → конвертируем в px от края
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

  const zIndex = pinnedData ? pinnedData.zIndex : 9000

  return createPortal(
    <>
      {/* Backdrop — только когда незакреплено */}
      {!pinned_ && (
        <div
          className="fixed inset-0 bg-black/50"
          style={{ zIndex: 8999 }}
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Modal — позиционируется абсолютно через left/top 50% + translate(-50%,-50%) */}
      {/* Drag hook меняет left и top напрямую */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalId)}
        className={cn(
          // Base — always applied
          'fixed w-full bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto flex flex-col',
          // Animation: opacity-only fade. Transform-based enter animations
          // (zoom-in-95, slide-in-from-bottom) conflict with the centering
          // transform on desktop, so we use a clean fade for all breakpoints.
          'animate-in fade-in-0 duration-200',
          // ── Mobile (<md): bottom-sheet ──────────────────────────────────────
          // Anchor to the bottom edge, span full width, slide-up feel via max-h.
          'bottom-0 inset-x-0 max-h-[92dvh] rounded-t-2xl rounded-b-none',
          // ── Desktop (≥md): classic centered dialog ──────────────────────────
          // ВАЖНО: явно сбрасываем bottom/left/right чтобы не конфликтовало с мобильным bottom-0.
          // md:inset-auto не всегда побеждает bottom-0 из-за порядка CSS в Tailwind —
          // поэтому прописываем md:bottom-auto md:left-auto md:right-auto явно.
          'md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:rounded-2xl md:max-h-[calc(100dvh-32px)]',
          !width && sizeClasses[size],
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        style={{
          zIndex,
          // maxWidth: only when an explicit `width` prop is provided (desktop).
          // Responsive width on desktop comes from sizeClasses above (max-w-*).
          maxWidth: width ? `min(${width}, calc(100vw - 32px))` : undefined,
          // left / top / transform / maxHeight are handled by Tailwind classes.
          // The drag hook writes inline left/top/transform during drag (overriding
          // the CSS classes). resetPosition() clears them after close so the
          // responsive classes are back in control on the next open.
        }}
        role="dialog"
        aria-modal={!pinned_}
        aria-labelledby={title ? 'modal-title' : undefined}
        dir={dir}
      >
        {/* Drag handle */}
        <div
          ref={handleRef}
          className="hidden md:flex items-center justify-center h-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <GripHorizontal className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>

        {/* Header */}
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

        {/* Footer — flex item, всегда внизу модалки */}
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
