'use client'

/**
 * useUIStackStore — глобальный менеджер UI-слоёв для кнопки "Назад".
 *
 * ═══════════════════════════════════════════════════════════════════
 * АРХИТЕКТУРА v3 — Balanced History
 * ═══════════════════════════════════════════════════════════════════
 *
 * ГЛАВНОЕ ПРАВИЛО: история браузера и UI-стек всегда синхронны.
 *
 * ПРОБЛЕМА v2:
 *   unregisterLayer() не убирал синтетическую запись из истории.
 *   При программном закрытии (крестик) запись оставалась «мёртвой».
 *   Следующий popstate: стек пуст → return, но браузер уже ушёл
 *   на предыдущий реальный URL → Next.js делал переход на /dashboard.
 *
 * РЕШЕНИЕ v3:
 *   _synthCount отслеживает сколько синтетических записей сейчас
 *   живёт в истории браузера (включая «мёртвые» от unregisterLayer).
 *   При popstate на нашу запись, но стек пуст — «мёртвая» запись:
 *   немедленно делаем history.forward() чтобы вернуться на текущий URL.
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

  registerLayer:   (id: string, closeFn: () => void) => void
  unregisterLayer: (id: string) => void
  _handlePopState: () => void
  _attachListener: () => void
}

export const useUIStackStore = create<UIStackState>((set, get) => ({
  stack: [],
  _listenerAttached: false,

  _attachListener: () => {
    if (get()._listenerAttached) return
    if (typeof window === 'undefined') return

    window.addEventListener('popstate', (event: PopStateEvent) => {
      const state = event.state
      const stack = get().stack
      console.log('[UIStack] popstate fired. state=', JSON.stringify(state), 'stack=', stack.map(l => l.id))

      // Если наш стек непустой — это "Назад" пока открыт UI-слой.
      // Немедленно вызываем forward() чтобы нейтрализовать шаг назад
      // ДО того как Next.js App Router обработает этот popstate.
      // Потом закрываем верхний слой.
      if (stack.length > 0) {
        console.log('[UIStack] stack has layers — calling forward() then closing top layer')
        window.history.forward()
        get()._handlePopState()
        return
      }

      // Стек пуст. Наша мёртвая запись?
      if (state && typeof state === 'object' && 'uiLayer' in state) {
        console.log('[UIStack] dead uiLayer entry — calling forward()')
        window.history.forward()
        return
      }

      // Не наша запись и стек пуст — нативная навигация Next.js
      console.log('[UIStack] NOT our entry and stack empty — letting Next.js handle it')
    })

    set({ _listenerAttached: true })
  },

  registerLayer: (id, closeFn) => {
    get()._attachListener()

    // Защита от двойной регистрации одного и того же слоя
    if (get().stack.some(l => l.id === id)) {
      console.log('[UIStack] registerLayer DUPLICATE skipped:', id)
      return
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({ uiLayer: id }, '')
    }

    console.log('[UIStack] registerLayer:', id, '→ stack size now', get().stack.length + 1)
    set(s => ({ stack: [...s.stack, { id, closeFn }] }))
  },

  unregisterLayer: (id) => {
    console.log('[UIStack] unregisterLayer:', id, '→ stack size now', get().stack.length - 1)
    set(s => ({ stack: s.stack.filter(l => l.id !== id) }))
  },

  _handlePopState: () => {
    const { stack } = get()
    console.log('[UIStack] _handlePopState. stack=', stack.map(l => l.id))

    if (stack.length === 0) {
      // Не должны сюда попасть — listener проверяет стек до вызова.
      // На всякий случай: forward() чтобы не уйти на предыдущий URL.
      console.log('[UIStack] _handlePopState called with empty stack — forward()')
      window.history.forward()
      return
    }

    // LIFO: закрываем верхний слой
    const topLayer = stack[stack.length - 1]
    console.log('[UIStack] closing top layer:', topLayer.id)
    set(s => ({ stack: s.stack.filter(l => l.id !== topLayer.id) }))
    topLayer.closeFn()
  },
}))
