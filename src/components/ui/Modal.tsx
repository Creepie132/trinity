'use client'

import { useEffect, useCallback, ReactNode, useRef } from 'react'
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
  modalId?: string   // уникальный ID для pin store (по умолчанию — случайный)
  pinTitle?: string  // название для индикатора закреплённых
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

// Генерируем стабильный ID один раз на mount
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

  const { pin, unpin, isPinned, bringToFront, pinned, maxPinned } = usePinnedModals()
  const pinned_ = isPinned(modalId)
  const { containerRef, handleRef, resetPosition, getCurrentPosition } = useDraggableDialog()

  // Восстанавливаем позицию если уже закреплена
  const pinnedData = pinned.find(p => p.id === modalId)
  useEffect(() => {
    if (pinnedData && containerRef.current) {
      containerRef.current.style.transform =
        `translate(calc(-50% + ${pinnedData.x}px), calc(-50% + ${pinnedData.y}px))`
    }
  }, [pinned_])

  const handlePin = useCallback(() => {
    if (pinned_) {
      unpin(modalId)
    } else {
      // Сохраняем ТЕКУЩУЮ позицию окна при закреплении
      const pos = getCurrentPosition()
      const canPin = pin({
        id: modalId,
        title: (typeof pinTitle === 'string' ? pinTitle : typeof title === 'string' ? title : 'Окно'),
        x: pos.x, y: pos.y,
        zIndex: 100,
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

  const zStyle = pinnedData ? { zIndex: pinnedData.zIndex } : { zIndex: 9000 }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      style={zStyle}
    >
      {/* Backdrop */}
      {!pinned_ && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Modal */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalId)}
        className={cn(
          'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'max-h-[90vh] flex flex-col',
          !width && sizeClasses[size],
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        style={width ? { maxWidth: `min(${width}, calc(100vw - 32px))` } : undefined}
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

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 p-5 pt-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
