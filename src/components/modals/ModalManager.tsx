'use client'

import { useModalStore } from '@/store/useModalStore'
import { ClientDetailsModal } from './ClientDetailsModal'
// Добавьте другие модалки здесь по мере необходимости

export function ModalManager() {
  return (
    <>
      <ClientDetailsModal />
      {/* Добавьте другие модалки здесь */}
    </>
  )
}
