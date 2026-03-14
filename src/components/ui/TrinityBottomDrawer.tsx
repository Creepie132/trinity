'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'

interface TrinityBottomDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  snapPoints?: (string | number)[]
}

export function TrinityBottomDrawer({
  isOpen,
  onClose,
  title,
  children,
}: TrinityBottomDrawerProps) {
  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerHeight = useRef(0)

  // Закрываем по Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Сброс позиции при открытии
  useEffect(() => {
    if (isOpen) {
      y.set(0)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, y])

  // ── Touch handlers на handle ────────────────────────────────────────────────
  function onHandleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startY.current = e.touches[0].clientY
    startVal.current = y.get()
    if (contentRef.current) drawerHeight.current = contentRef.current.offsetHeight
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - startY.current
    // Разрешаем только вниз (положительный delta)
    const next = Math.max(0, startVal.current + delta)
    // Резиновый эффект при попытке тянуть вверх
    y.set(next)
  }

  function onHandleTouchEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    const current = y.get()
    const threshold = drawerHeight.current * 0.35

    if (current > threshold) {
      // Закрыть — анимируем вниз
      animate(y, drawerHeight.current || 600, {
        type: 'tween',
        duration: 0.25,
        ease: [0.32, 0.72, 0, 1],
        onComplete: onClose,
      })
    } else {
      // Вернуть на место
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/40 z-40"
            style={{ opacity: overlayOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            ref={contentRef}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl flex flex-col outline-none"
            style={{ y, maxHeight: 'calc(100dvh - 2rem)', touchAction: 'none' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Handle — единственная зона drag */}
            <div
              className="flex-shrink-0 flex justify-center pt-3 pb-3 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: 'none' }}
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 pointer-events-none" />
            </div>

            {/* Title */}
            {title && (
              <div className="flex-shrink-0 px-6 pb-3">
                <h3 className="text-lg font-semibold">{title}</h3>
              </div>
            )}

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto px-6 pb-6"
              style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
