'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useModalBackButton } from '@/hooks/useModalBackButton'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function BaseModal({ open, onClose, children, className = '' }: BaseModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // Применяем хук для обработки кнопки "Назад"
  useModalBackButton(open, onClose)

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className={className}>
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={className}>
        {children}
      </DialogContent>
    </Dialog>
  )
}