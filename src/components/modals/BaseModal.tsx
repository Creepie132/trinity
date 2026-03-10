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
  
  // Обработка монтирования модалки и добавление в историю
  useEffect(() => {
    if (open) {
      // Задержка добавления в историю для корректной анимации
      const timer = setTimeout(() => {
        if (
          modalType.startsWith('client-') ||
          modalType.startsWith('product-') ||
          modalType.startsWith('payment-')
        ) {
          pushModal(modalType)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, modalType, pushModal])

  // Обработка кнопки "Назад"
  useEffect(() => {
    const handlePopState = () => {
      if (open) {
        const shouldHandle = 
          modalType.startsWith('client-') ||
          modalType.startsWith('product-') ||
          modalType.startsWith('payment-')

        if (shouldHandle) {
          const poppedModal = popModal()
          if (poppedModal === modalType) {
            onClose()
          }
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [open, modalType, onClose, popModal])

  // CSS классы для анимации
  const dialogClassName = `
    ${className}
    animate-in
    data-[state=open]:fade-in-0
    data-[state=open]:zoom-in-95
    data-[state=open]:slide-in-from-bottom-2
    duration-200
    ease-out
  `

  const sheetClassName = `
    ${className}
    animate-in
    data-[state=open]:fade-in-0
    data-[state=open]:slide-in-from-bottom-full
    duration-300
    ease-out
  `

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