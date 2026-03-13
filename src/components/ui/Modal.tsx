'use client'

import { useEffect, useCallback, ReactNode, useState, useRef } from 'react'
import { X, GripHorizontal, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraggableDialog } from '@/hooks/useDraggableDialog'

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
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

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
}: ModalProps) {
  const [pinned, setPinned] = useState(false)
  const { containerRef, handleRef, resetPosition } = useDraggableDialog()

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !pinned) onClose()
    },
    [closeOnEscape, onClose, pinned]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      if (!pinned) document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape, pinned])

  // При закрытии сбрасываем pin и позицию
  useEffect(() => {
    if (!open) {
      setPinned(false)
      resetPosition()
    }
  }, [open, resetPosition])

  if (!open) return null

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center p-4',
      pinned && 'pointer-events-none' // pinned: клики сквозь backdrop
    )}>
      {/* Backdrop — скрыт когда закреплено */}
      {!pinned && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Modal */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'max-h-[90vh] flex flex-col',
          !width && sizeClasses[size],
          pinned && 'pointer-events-auto ring-2 ring-orange-400/60 shadow-orange-200/40',
          className
        )}
        style={width ? { maxWidth: `min(${width}, calc(100vw - 32px))` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        dir={dir}
      >
        {/* Drag handle — только на десктопе */}
        <div
          ref={handleRef}
          className="hidden md:flex items-center justify-center h-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none group bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <GripHorizontal className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-5 pb-0 pt-1">
            <div className="flex-1 min-w-0 pt-1">
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-1 -mt-1 -mr-1">
              {/* Pin button — только на десктопе */}
              <button
                onClick={() => setPinned(p => !p)}
                className={cn(
                  'hidden md:flex p-1.5 rounded-full transition-colors',
                  pinned
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 hover:bg-orange-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500'
                )}
                title={pinned ? 'Открепить' : 'Закрепить на экране'}
              >
                {pinned
                  ? <PinOff className="w-4 h-4" />
                  : <Pin className="w-4 h-4" />
                }
              </button>

              {/* Close button */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-5',
            footer && 'pb-3',
            contentClassName
          )}
        >
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
