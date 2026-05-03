'use client'

/**
 * useScrollLock — универсальная блокировка скролла фона.
 *
 * Решает проблему Scroll Chaining на мобильных устройствах (PWA):
 * при открытых модалках / drawer'ах фон не должен прокручиваться.
 *
 * iOS Safari специфика:
 *   overflow: hidden на body НЕ работает в iOS Safari — браузер его игнорирует.
 *   Единственный надёжный способ: position: fixed + top: -scrollY.
 *   При закрытии восстанавливаем scrollY вручную через window.scrollTo().
 *
 * Android Chrome:
 *   Достаточно overflow: hidden + touch-action: none.
 *
 * Использование:
 *   useScrollLock(isOpen)
 *
 * Поддержка стека:
 *   Хук считает количество одновременно открытых блокировщиков.
 *   Блокировка снимается только когда все они закрыты (счётчик = 0).
 *   Это позволяет безопасно использовать хук в нескольких компонентах.
 */

import { useEffect } from 'react'

// Глобальный счётчик — сколько компонентов сейчас требуют блокировки
let lockCount = 0

// Детектируем iOS один раз
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad OS 13+ маскируется под Mac
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function lockScroll(): void {
  if (lockCount > 0) {
    // Уже заблокировано — просто инкрементируем
    lockCount++
    return
  }

  lockCount++

  const body = document.body
  const scrollY = window.scrollY

  if (isIOS()) {
    // iOS Safari fix: фиксируем body с сохранением позиции прокрутки
    body.style.position   = 'fixed'
    body.style.top        = `-${scrollY}px`
    body.style.left       = '0'
    body.style.right      = '0'
    body.style.overflow   = 'hidden'
    // Сохраняем scrollY для восстановления
    body.dataset.scrollY  = String(scrollY)
  } else {
    // Android / Desktop
    body.style.overflow   = 'hidden'
    body.style.touchAction = 'none'
  }
}

function unlockScroll(): void {
  if (lockCount <= 0) return

  lockCount--

  if (lockCount > 0) {
    // Ещё есть другие блокировщики — не снимаем
    return
  }

  const body = document.body

  if (isIOS()) {
    const scrollY = parseInt(body.dataset.scrollY || '0', 10)
    body.style.position   = ''
    body.style.top        = ''
    body.style.left       = ''
    body.style.right      = ''
    body.style.overflow   = ''
    delete body.dataset.scrollY
    // Восстанавливаем позицию прокрутки
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior })
  } else {
    body.style.overflow    = ''
    body.style.touchAction = ''
  }
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return

    lockScroll()

    return () => {
      unlockScroll()
    }
  }, [active])
}
