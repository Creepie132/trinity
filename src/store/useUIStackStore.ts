'use client'

/**
 * useUIStackStore — глобальный менеджер UI-слоёв для кнопки "Назад".
 *
 * ═══════════════════════════════════════════════════════════════════
 * АРХИТЕКТУРА v4 — replaceState на popstate
 * ═══════════════════════════════════════════════════════════════════
 *
 * Проблема всех предыдущих версий:
 *   history.forward() — асинхронный. К моменту его исполнения Next.js
 *   App Router уже обработал popstate и сделал навигацию.
 *
 * Решение v4:
 *   При ОТКРЫТИИ: pushState({ uiLayer: id }) — добавляем запись.
 *   При popstate (Назад нажата):
 *     1. Синхронно делаем replaceState с текущим URL — перезаписываем
 *        запись в истории обратно на нашу. URL не меняется.
 *     2. Next.js видит popstate, но URL тот же → не делает навигацию.
 *     3. Закрываем верхний UI-слой.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand'

export interface UILayer {
  id: string
  closeFn: () => void
}

interface UIStackState {
  stack: UILayer[]
  _listenerAttached: boolean
  _currentUrl: string

  registerLayer:   (id: string, closeFn: () => void) => void
  unregisterLayer: (id: string) => void
  _handlePopState: (event: PopStateEvent) => void
  _attachListener: () => void
}

export const useUIStackStore = create<UIStackState>((set, get) => ({
  stack: [],
  _listenerAttached: false,
  _currentUrl: '',

  _attachListener: () => {
    if (get()._listenerAttached) return
    if (typeof window === 'undefined') return

    window.addEventListener('popstate', (event: PopStateEvent) => {
      get()._handlePopState(event)
    }, true) // capture phase — раньше Next.js

    set({ _listenerAttached: true })
  },

  registerLayer: (id, closeFn) => {
    get()._attachListener()
    if (get().stack.some(l => l.id === id)) return

    // Запоминаем текущий URL перед pushState
    const currentUrl = window.location.href
    window.history.pushState({ uiLayer: id }, '', currentUrl)

    console.log('[UIStack] registerLayer:', id, 'url=', currentUrl)
    set(s => ({ stack: [...s.stack, { id, closeFn }], _currentUrl: currentUrl }))
  },

  unregisterLayer: (id) => {
    console.log('[UIStack] unregisterLayer:', id)
    set(s => ({ stack: s.stack.filter(l => l.id !== id) }))
  },

  _handlePopState: (event: PopStateEvent) => {
    const { stack, _currentUrl } = get()
    console.log('[UIStack] popstate. stack=', stack.map(l => l.id), 'state=', event.state)

    if (stack.length === 0) {
      // Наша мёртвая запись — восстанавливаем URL синхронно
      if (event.state && typeof event.state === 'object' && 'uiLayer' in event.state) {
        const url = _currentUrl || window.location.href
        console.log('[UIStack] dead entry — replaceState back to', url)
        window.history.replaceState(event.state, '', url)
      }
      return
    }

    // Синхронно восстанавливаем URL — Next.js не увидит изменения
    const url = _currentUrl || window.location.href
    console.log('[UIStack] intercepting — replaceState to', url)
    window.history.replaceState({ uiLayer: stack[stack.length - 1].id }, '', url)

    // Закрываем верхний слой
    const topLayer = stack[stack.length - 1]
    console.log('[UIStack] closing:', topLayer.id)
    set(s => ({ stack: s.stack.filter(l => l.id !== topLayer.id) }))
    topLayer.closeFn()
  },
}))
