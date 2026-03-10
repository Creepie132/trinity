'use client'

import { useEffect } from 'react'
import { useModalStore } from '@/store/useModalStore'

export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (isOpen) {
      // При открытии модалки добавляем состояние в историю
      window.history.pushState({ modal: true }, '')

      // Слушаем popstate для перехвата кнопки "Назад"
      const handlePopState = (event: PopStateEvent) => {
        if (isOpen) {
          onClose()
          event.preventDefault()
        }
      }

      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen, onClose])
}