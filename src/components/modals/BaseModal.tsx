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
  // left/top — абсолютные пиксели на экране (не смещение от центра)
  const dragState = useRef({ dragging: false, offX: 0, offY: 0, left: 0, top: 0 })

  // Центрируем модалку при открытии и восстанавливаем позицию если уже закреплена
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const existing = pinned.find(p => p.id === modalType)
    if (existing) {
      el.style.left = `${existing.x}px`
      el.style.top  = `${existing.y}px`
      dragState.current.left = existing.x
      dragState.current.top  = existing.y
    } else {
      // Центр экрана
      const l = Math.round((window.innerWidth  - el.offsetWidth)  / 2)
      const t = Math.round((window.innerHeight - el.offsetHeight) / 2)
      el.style.left = `${l}px`
      el.style.top  = `${t}px`
      dragState.current.left = l
      dragState.current.top  = t
    }
  }, [open, pinned_, modalType])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const rafId = useRef<number | null>(null)

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    const s = dragState.current
    s.dragging = true
    // Запоминаем смещение курсора относительно левого верхнего угла модалки
    s.offX = e.clientX - s.left
    s.offY = e.clientY - s.top
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = dragState.current
    if (!s.dragging || !containerRef.current) return
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return
      const el = containerRef.current
      const l = Math.min(window.innerWidth  - el.offsetWidth,  Math.max(0, e.clientX - s.offX))
      const t = Math.min(window.innerHeight - 40,              Math.max(0, e.clientY - s.offY))
      s.left = l; s.top = t
      // Пишем left/top напрямую — никаких transform, никаких calc()
      el.style.left = `${l}px`
      el.style.top  = `${t}px`
    })
  }, [])

  const onMouseUp = useCallback(() => {
    const s = dragState.current
    if (!s.dragging) return
    s.dragging = false
    if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null }
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    if (isPinned(modalType)) {
      usePinnedModals.getState().updatePosition(modalType, s.left, s.top)
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
        x: dragState.current.left,
        y: dragState.current.top,
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
  const zIdx = pinnedData ? pinnedData.zIndex : 50

  return (
    <>
      {/* Backdrop — только когда не закреплено и открыто */}
      {!pinned_ && open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: zIdx - 1 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Modal container — position:fixed с left/top напрямую, без flex-родителя */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalType)}
        className={cn(
          'fixed w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto',
          'max-h-[90vh] flex flex-col',
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        style={{ zIndex: zIdx, willChange: 'left, top', transition: 'box-shadow .2s' }}
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
    </>
  )
}
