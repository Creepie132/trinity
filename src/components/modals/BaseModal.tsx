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
  // x/y — текущее смещение translate3d; maxX/maxY — границы, кешируются при mousedown
  const dragState = useRef({ dragging: false, startMouseX: 0, startMouseY: 0, startX: 0, startY: 0, x: 0, y: 0, maxX: 0, maxY: 0 })

  // Применяем translate3d — единственный способ двигать элемент без layout
  const applyPos = useCallback((x: number, y: number) => {
    if (!containerRef.current) return
    containerRef.current.style.transform = `translate3d(${x}px,${y}px,0)`
    dragState.current.x = x
    dragState.current.y = y
  }, [])

  // Центрируем/восстанавливаем позицию при открытии
  useEffect(() => {
    if (!open || !containerRef.current) return
    const el = containerRef.current
    const existing = pinned.find(p => p.id === modalType)
    if (existing) {
      applyPos(existing.x, existing.y)
    } else {
      // Сброс перед чтением размеров
      el.style.transform = 'translate3d(0,0,0)'
      const rect = el.getBoundingClientRect()
      applyPos(
        Math.round((window.innerWidth  - rect.width)  / 2),
        Math.round((window.innerHeight - rect.height) / 2)
      )
    }
  }, [open, pinned_, modalType, applyPos])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const rafId = useRef<number | null>(null)

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    const s = dragState.current
    // Кешируем всё при mousedown — ни одного чтения DOM в mousemove
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      s.maxX = window.innerWidth  - rect.width
      s.maxY = window.innerHeight - 40
    }
    s.dragging   = true
    s.startMouseX = e.clientX
    s.startMouseY = e.clientY
    s.startX     = s.x
    s.startY     = s.y
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = dragState.current
    if (!s.dragging) return
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      const dx = e.clientX - s.startMouseX
      const dy = e.clientY - s.startMouseY
      const x = Math.min(s.maxX, Math.max(0, s.startX + dx))
      const y = Math.min(s.maxY, Math.max(0, s.startY + dy))
      applyPos(x, y)
    })
  }, [applyPos])

  const onMouseUp = useCallback(() => {
    const s = dragState.current
    if (!s.dragging) return
    s.dragging = false
    if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null }
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    if (isPinned(modalType)) {
      usePinnedModals.getState().updatePosition(modalType, s.x, s.y)
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
        x: dragState.current.x,
        y: dragState.current.y,
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

      {/* Modal container — position:fixed, двигается через translate3d (GPU, без layout) */}
      <div
        ref={containerRef}
        onMouseDown={() => pinned_ && bringToFront(modalType)}
        className={cn(
          'fixed top-0 left-0 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto',
          'max-h-[90vh] flex flex-col',
          pinned_ && 'ring-2 ring-orange-400/60',
          className
        )}
        style={{ zIndex: zIdx, willChange: 'transform', transition: 'box-shadow .2s' }}
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
