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
  const idRef   = useRef<string>(modalIdProp || `modal-${++idCounter}`)
  const modalId = idRef.current

  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const { pin, unpin, isPinned, bringToFront, pinned, maxPinned } = usePinnedModals()
  const pinned_ = isPinned(modalId)
  const { containerRef, handleRef, resetPosition, getCurrentPosition } = useDraggableDialog()
  const pinnedData = pinned.find(p => p.id === modalId)

  useEffect(() => {
    if (pinnedData && containerRef.current) {
      const left = window.innerWidth / 2 + pinnedData.x
      const top  = window.innerHeight / 2 + pinnedData.y
      containerRef.current.style.left      = `${left}px`
      containerRef.current.style.top       = `${top}px`
      containerRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [pinned_])

  const handlePin = useCallback(() => {
    if (pinned_) {
      unpin(modalId)
    } else {
      const pos    = getCurrentPosition()
      const canPin = pin({
        id:     modalId,
        title:  (typeof pinTitle === 'string' ? pinTitle : typeof title === 'string' ? title : 'Окно'),
        x:      pos.x,
        y:      pos.y,
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

  const zIndex   = zIndexOverride ?? (pinnedData ? pinnedData.zIndex : 9000)
  const maxWidth = width ? `clamp(320px, ${width}, calc(100vw - 32px))` : (sizeMap[size] ?? sizeMap.md)

  // ── Close button: absolute inside modal, top corner per dir ──────────────
  // RTL → top-left corner (inset-inline-start)
  // LTR → top-right corner (inset-inline-end)
  // Placed as absolute child so it's always visible regardless of modal position.
  const closeBtnBase: React.CSSProperties = {
    position:       'absolute',
    top:            10,
    zIndex:         20,
    width:          34,
    height:         34,
    borderRadius:   '50%',
    background:     'rgba(0,0,0,0.55)',
    border:         'none',
    color:          '#fff',
    cursor:         'pointer',
    display:        'none', // shown only on desktop via inline override in JSX
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 2px 8px rgba(0,0,0,0.35)',
    transition:     'transform 0.15s, background 0.15s',
    pointerEvents:  'auto',
    // dir-aware corner:
    ...(dir === 'rtl'
      ? { left: 10, right: 'auto' }
      : { right: 10, left: 'auto' }),
  }

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

      {/* Modal container — overflow: visible so close btn can peek out */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalId)}
        data-trinity-modal-wrapper=""
        className={cn(
          'fixed bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto flex flex-col',
          'animate-in fade-in-0 duration-200',
          'rounded-2xl',
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'max-h-[92dvh] md:max-h-[calc(100dvh-32px)]',
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        data-desktop="true"
        style={{
          zIndex,
          width:        '95%',
          maxWidth,
          marginInline: 'auto',
          overflowWrap: 'break-word',
          overflow:     'visible',   // ← was 'hidden'; now close btn is never clipped
          position:     'fixed',
        }}
        role="dialog"
        aria-modal={!pinned_}
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

            {/* Pin button */}
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
            </div>

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
                </div>
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

        {/* ── Close button — absolute inside modal, always visible ──────────
            desktop only (hidden on mobile — ModalBottomSheet has its own).
            RTL → top-left corner; LTR → top-right corner.
        ─────────────────────────────────────────────────────────────────── */}
        {showCloseButton && !pinned_ && (
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="hidden md:flex"
            style={closeBtnBase}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform  = 'scale(1.12)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.75)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform  = 'scale(1)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)'
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </>,
    document.body
  )
}

export default Modal
