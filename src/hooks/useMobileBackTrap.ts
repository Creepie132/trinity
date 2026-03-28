'use client'

/**
 * useMobileBackTrap — универсальный хук перехвата кнопки "Назад".
 *
 * ═══════════════════════════════════════════════════════════════════
 * v2 — Race-safe, unmount-safe, routing-safe
 * ═══════════════════════════════════════════════════════════════════
 *
 * ПРАВИЛА:
 *   ✓ Регистрируем слой только один раз при isOpen: false→true
 *   ✓ При isOpen: true→false — ТОЛЬКО unregisterLayer() (без history.back)
 *   ✓ Cleanup при анмаунте — ТОЛЬКО unregisterLayer() (без history.back)
 *   ✓ history.back() вызывается ТОЛЬКО из _handlePopState() в сторе
 *   ✓ Работает только на мобильных < 768px
 *
 * ИСПОЛЬЗОВАНИЕ:
 *   useMobileBackTrap(open, onClose)                    // модалки, шторки
 *   useMobileBackTrap(Math.abs(swipeX) >= 10, reset)    // свайп
 *   useMobileBackTrap(drawerOpen, closeDrawer)          // вложенный drawer
 */

import { useEffect, useId, useRef } from 'react'
import { useUIStackStore } from '@/store/useUIStackStore'

export function useMobileBackTrap(isOpen: boolean, closeFn: () => void) {
  // Стабильный уникальный ID для этого экземпляра хука (не меняется между рендерами)
  const rawId   = useId()
  const id      = rawId.replace(/:/g, '_')

  const { registerLayer, unregisterLayer } = useUIStackStore()

  // Актуальная closeFn через ref — чтобы не пересоздавать регистрацию
  // при каждом ре-рендере родителя (inline-функции пересоздаются каждый рендер)
  const closeFnRef = useRef(closeFn)
  useEffect(() => { closeFnRef.current = closeFn }, [closeFn])

  // Отслеживаем реально ли слой зарегистрирован прямо сейчас.
  // Нужно чтобы cleanup в useEffect не делал unregister дважды.
  const registeredRef = useRef(false)

  // Мобильный viewport — вычисляем один раз при маунте компонента.
  // MediaQueryList используем через ref чтобы не пересчитывать на каждый рендер.
  const isMobileRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    isMobileRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => { isMobileRef.current = e.matches }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    // Не активен на десктопе
    if (!isMobileRef.current) {
      console.log('[BackTrap] SKIP (not mobile), id=', id, 'isOpen=', isOpen)
      return
    }

    if (isOpen && !registeredRef.current) {
      console.log('[BackTrap] REGISTER id=', id)
      registeredRef.current = true
      registerLayer(id, () => closeFnRef.current())

    } else if (!isOpen && registeredRef.current) {
      console.log('[BackTrap] UNREGISTER id=', id)
      registeredRef.current = false
      unregisterLayer(id)
    }

    return () => {
      if (registeredRef.current) {
        console.log('[BackTrap] CLEANUP (unmount) id=', id)
        registeredRef.current = false
        unregisterLayer(id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
}
