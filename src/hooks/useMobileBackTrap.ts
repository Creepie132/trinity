'use client'

import { useEffect, useId, useRef } from 'react'
import { useUIStackStore } from '@/store/useUIStackStore'

/**
 * useMobileBackTrap — перехват кнопки "Назад" для UI-слоёв.
 *
 * Регистрирует слой в useUIStackStore при isOpen=true.
 * При нажатии "Назад" — стор вызывает closeFn и убирает слой.
 * При программном закрытии — убирает слой без касания истории.
 *
 * Намеренно НЕ проверяет isMobile — компоненты сами решают
 * когда рендериться. Race condition с MediaQuery убран.
 */
export function useMobileBackTrap(isOpen: boolean, closeFn: () => void) {
  const rawId = useId()
  const id    = rawId.replace(/:/g, '_')

  const { registerLayer, unregisterLayer } = useUIStackStore()

  // Держим актуальную closeFn без пересоздания регистрации
  const closeFnRef = useRef(closeFn)
  useEffect(() => { closeFnRef.current = closeFn }, [closeFn])

  // Флаг: зарегистрирован ли слой прямо сейчас
  const registeredRef = useRef(false)

  useEffect(() => {
    if (isOpen && !registeredRef.current) {
      console.log('[BackTrap] REGISTER', id)
      registeredRef.current = true
      registerLayer(id, () => {
        // closeFn вызван из _handlePopState — стор уже убрал слой.
        // Сбрасываем флаг чтобы cleanup не вызвал unregister повторно.
        registeredRef.current = false
        closeFnRef.current()
      })
    } else if (!isOpen && registeredRef.current) {
      console.log('[BackTrap] UNREGISTER', id)
      registeredRef.current = false
      unregisterLayer(id)
    }

    return () => {
      if (registeredRef.current) {
        console.log('[BackTrap] CLEANUP', id)
        registeredRef.current = false
        unregisterLayer(id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
}
