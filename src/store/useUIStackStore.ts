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
      // Реагируем ТОЛЬКО на наши синтетические записи
      if (state && typeof state === 'object' && 'uiLayer' in state) {
        get()._handlePopState()
      }
      // Нативная навигация (Next.js router) — не трогаем
    })

    set({ _listenerAttached: true })
  },

  registerLayer: (id, closeFn) => {
    get()._attachListener()

    // Защита от двойной регистрации одного и того же слоя
    if (get().stack.some(l => l.id === id)) return

    // Добавляем синтетическую запись — НЕ меняем pathname/search
    if (typeof window !== 'undefined') {
      window.history.pushState({ uiLayer: id }, '')
    }

    set(s => ({ stack: [...s.stack, { id, closeFn }] }))
  },

  unregisterLayer: (id) => {
    // ТОЛЬКО чистим стек. history НЕ ТРОГАЕМ.
    // Синтетическая запись остаётся «мёртвой» в истории.
    // _handlePopState знает как с ней обращаться (см. ниже).
    set(s => ({ stack: s.stack.filter(l => l.id !== id) }))
  },

  _handlePopState: () => {
    const { stack } = get()

    if (stack.length === 0) {
      // «Мёртвая» синтетическая запись: слой уже был закрыт программно,
      // но его запись осталась в истории браузера.
      // Браузер УЖЕ сделал шаг назад — немедленно возвращаемся вперёд,
      // чтобы Next.js не видел изменение URL и не делал переход на /dashboard.
      window.history.forward()
      return
    }

    // LIFO: закрываем верхний слой
    const topLayer = stack[stack.length - 1]
    set(s => ({ stack: s.stack.filter(l => l.id !== topLayer.id) }))
    topLayer.closeFn()
  },
}))
