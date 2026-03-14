'use client'

import { Drawer } from 'vaul'
import { useEffect, useState, ReactNode } from 'react'

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
  snapPoints,
}: TrinityBottomDrawerProps) {
  const [viewportHeight, setViewportHeight] = useState('100dvh')

  useEffect(() => {
    function handleResize() {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`)
      }
    }

    function handleFocusOut() {
      setTimeout(() => setViewportHeight('100dvh'), 100)
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      snapPoints={snapPoints}
      // Отключаем масштабирование фона — убирает один из источников лагов
      shouldScaleBackground={false}
      // Нативный drag без задержки
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl flex flex-col outline-none will-change-transform"
          style={{ maxHeight: `calc(${viewportHeight} - 2rem)` }}
        >
          {/* Drag handle — touch-action: none убирает задержку распознавания жеста */}
          <div
            className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Title */}
          {title && (
            <Drawer.Title className="flex-shrink-0 px-6 pb-3">
              <h3 className="text-lg font-semibold">{title}</h3>
            </Drawer.Title>
          )}

          {/* Scrollable content — overscroll-contain не даёт drawer закрыться при скролле внутри */}
          <div
            className="flex-1 overflow-y-auto px-6 pb-6"
            style={{ overscrollBehavior: 'contain' }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
