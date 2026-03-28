'use client'

import { useEffect, useId, useRef } from 'react'
import { useUIStackStore } from '@/store/useUIStackStore'

/**
 * useMobileBackTrap — перехват кнопки "Назад" для UI-слоёв.
 *
 * Регистрирует слой в useUIStackStore при isOpen=true.
 *
 * Два сценария закрытия:
 *  1. Аппаратная «Назад» → _handlePopState вызывает closeFn напрямую.
 *     registeredRef сбрасывается → cleanup ничего не делает.
 *     programmatic=false → go(-1) не вызывается (popstate уже потратил запись).
 *
 *  2. Программное закрытие (крестик, backdrop) → isOpen становится false →
 *     unregisterLayer(id, programmatic=true) → go(-1) убирает pushState-запись.
 *     _skipNextPopState подавляет наш обработчик на этот go(-1).
 *
 * Итог: history.length == stack.length в любой момент.
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
        // Вызван из _handlePopState (аппаратная «Назад»).
        // Стор уже убрал слой из stack. Сбрасываем флаг.
        // unregisterLayer НЕ вызываем — popstate уже "потратил" запись.
        registeredRef.current = false
        closeFnRef.current()
      })
    } else if (!isOpen && registeredRef.current) {
      // Программное закрытие — unregisterLayer с go(-1)
      console.log('[BackTrap] UNREGISTER (programmatic)', id)
      registeredRef.current = false
      unregisterLayer(id, true)
    }

    return () => {
      if (registeredRef.current) {
        // Unmount при открытом состоянии — тоже программное
        console.log('[BackTrap] CLEANUP', id)
        registeredRef.current = false
        unregisterLayer(id, true)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
}
