'use client'

import { Drawer } from 'vaul'
import { useState, useEffect, ReactNode } from 'react'

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
      // visualViewport учитывает клавиатуру
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`)
      }
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
    }
  }, [])

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content 
          className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl overflow-hidden flex flex-col outline-none"
          style={{ maxHeight: `calc(${viewportHeight} - 2rem)` }}
        >
          {/* Handle — не скроллится */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Title — не скроллится */}
          {title && (
            <Drawer.Title className="flex-shrink-0 px-6 pb-3">
              <h3 className="text-lg font-semibold">{title}</h3>
            </Drawer.Title>
          )}

          {/* Content — СКРОЛЛИТСЯ */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 overscroll-contain">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
