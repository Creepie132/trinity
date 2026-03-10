'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useModalStack } from '@/store/useModalStack'
import { ModalType } from '@/store/useModalStore'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  modalType: ModalType
}

export function BaseModal({ open, onClose, children, className = '', modalType }: BaseModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { pushModal, popModal } = useModalStack()
  
  useEffect(() => {
    if (open) {
      pushModal(modalType)
    }
  }, [open, modalType, pushModal])

  useEffect(() => {
    // Обработка кнопки "Назад" только для определенных модалок
    const handlePopState = (event: PopStateEvent) => {
      const currentModalType = modalType
      if (
        currentModalType.startsWith('client-') ||
        currentModalType.startsWith('product-') ||
        currentModalType.startsWith('payment-')
      ) {
        const poppedModal = popModal()
        if (poppedModal === currentModalType) {
          onClose()
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [modalType, onClose, popModal])

  const dialogClassName = `${className} animate-in fade-in-0 zoom-in-95 duration-200`
  const sheetClassName = `${className} animate-in slide-in-from-bottom-full duration-300`

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className={sheetClassName} side="bottom">
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={dialogClassName}>
        {children}
      </DialogContent>
    </Dialog>
  )
}