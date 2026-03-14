'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useModalStack } from '@/store/useModalStack'
import { ModalType } from '@/store/useModalStore'
import { usePinnedModals } from '@/store/usePinnedModals'
import { X, GripHorizontal, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  modalType: ModalType
  title?: string  // для отображения в PinnedModals индикаторе
}

export function BaseModal({
  open, onClose, children, className = '', modalType, title
}: BaseModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { pushModal, popModal } = useModalStack()
  const { pin, unpin, isPinned, bringToFront, pinned, maxPinned } = usePinnedModals()

  const pinned_ = isPinned(modalType)
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, modalW: 0, modalH: 0 })

  // Восстанавливаем позицию если уже закреплена
  useEffect(() => {
    const existing = pinned.find(p => p.id === modalType)
    if (existing && containerRef.current) {
      containerRef.current.style.transform =
        `translate(calc(-50% + ${existing.x}px), calc(-50% + ${existing.y}px))`
      dragState.current.currentX = existing.x
      dragState.current.currentY = existing.y
    }
  }, [pinned_, modalType])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    const s = dragState.current
    // Кешируем размеры один раз при начале drag — чтобы не вызывать getBoundingClientRect() в mousemove
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      s.modalW = rect.width
      s.modalH = rect.height
    }
    s.dragging = true
    s.startX = e.clientX - s.currentX
    s.startY = e.clientY - s.currentY
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const rafId = useRef<number | null>(null)

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = dragState.current
    if (!s.dragging || !containerRef.current) return
    // Отменяем предыдущий незавершённый кадр
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return
      const dx = Math.min(window.innerWidth - s.modalW / 2, Math.max(-(s.modalW / 2), e.clientX - s.startX))
      const dy = Math.min(window.innerHeight - 40, Math.max(-(s.modalH / 2) + 40, e.clientY - s.startY))
      s.currentX = dx; s.currentY = dy
      containerRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    })
  }, [])

  const onMouseUp = useCallback(() => {
    const s = dragState.current
    if (!s.dragging) return
    s.dragging = false
    if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null }
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    // Обновляем позицию в store если закреплено
    if (isPinned(modalType)) {
      usePinnedModals.getState().updatePosition(modalType, s.currentX, s.currentY)
    }
  }, [isPinned, modalType])

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return
    handle.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      handle.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseDown, onMouseMove, onMouseUp])

  // ── Pin / Unpin ───────────────────────────────────────────────────────────
  const handlePin = useCallback(() => {
    if (pinned_) {
      unpin(modalType)
    } else {
      const canPin = pin({
        id: modalType,
        title: title || modalType,
        x: dragState.current.currentX,
        y: dragState.current.currentY,
        zIndex: 100,
      })
      if (!canPin) {
        // Достигнут лимит 3х — небольшой shake
        containerRef.current?.classList.add('animate-shake')
        setTimeout(() => containerRef.current?.classList.remove('animate-shake'), 500)
      }
    }
  }, [pinned_, pin, unpin, modalType, title])

  // ── История для кнопки "Назад" ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (
          modalType.startsWith('client-') ||
          modalType.startsWith('product-') ||
          modalType.startsWith('payment-')
        ) { pushModal(modalType) }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, modalType, pushModal])

  useEffect(() => {
    const handlePopState = () => {
      if (!open) return
      const ok = modalType.startsWith('client-') || modalType.startsWith('product-') || modalType.startsWith('payment-')
      if (ok && popModal() === modalType) onClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [open, modalType, onClose, popModal])

  // Escape — не закрывает если закреплено
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !pinned_) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, pinned_, onClose])

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={open && !pinned_} onOpenChange={onClose}>
        <SheetContent
          className={cn(
            className,
            'animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-full duration-300 ease-out'
          )}
          side="bottom"
        >
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  // ── Desktop — кастомный оверлей ───────────────────────────────────────────
  if (!open && !pinned_) return null

  const pinnedData = usePinnedModals.getState().pinned.find(p => p.id === modalType)
  const zStyle = pinnedData ? { zIndex: pinnedData.zIndex } : { zIndex: 50 }

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-4 pointer-events-none',
      )}
      style={zStyle}
    >
      {/* Backdrop — только когда не закреплено и открыто */}
      {!pinned_ && open && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Modal container */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalType)}
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto',
          'max-h-[90vh] flex flex-col',
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        style={{ transition: 'box-shadow .2s', willChange: 'transform' }}
        role="dialog"
        aria-modal={!pinned_}
      >
        {/* Drag handle */}
        <div
          ref={handleRef}
          className="hidden md:flex items-center justify-center h-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <GripHorizontal className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>

        {/* Pin + Close buttons — вверху справа */}
        <div className="absolute top-2 left-3 flex items-center gap-1 z-10">
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

        {/* Close button */}
        {!pinned_ && (
          <button
            onClick={onClose}
            className="absolute top-2 right-3 z-10 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
