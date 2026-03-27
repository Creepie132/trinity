'use client'

/**
 * useUIStackStore — глобальный менеджер UI-слоёв для кнопки "Назад".
 *
 * ═══════════════════════════════════════════════════════════════════
 * АРХИТЕКТУРА v2 — Safe Synthetic History
 * ═══════════════════════════════════════════════════════════════════
 *
 * ГЛАВНОЕ ПРАВИЛО: history.back() при программном закрытии ЗАПРЕЩЁН.
 *
 * Почему старая версия ломала роутинг:
 *   - unregisterLayer() вызывал history.back() вслепую
 *   - При action "Продажа": свайп закрывается → back() → убивает реальный URL
 *   - Cleanup useEffect срабатывал при анмаунте → лишний back()
 *
 * Новая стратегия:
 *   ОТКРЫТИЕ:  registerLayer()   → pushState({ uiLayer: id })  ✓
 *   ЗАКРЫТИЕ программное:        → только удаляем из стека, историю НЕ ТРОГАЕМ
 *   ЗАКРЫТИЕ по "Назад":         → popstate срабатывает, closeFn(), удаляем из стека
 *
 * "Мусор" в истории (синтетические записи без соответствующего слоя):
 *   Они безопасны. Следующее нажатие "Назад" попадёт на них, popstate
 *   сработает, стек пуст → мы просто ПРОПУСКАЕМ (не вызываем closeFn).
 *   Браузер продолжит навигацию назад по реальным URL-записям.
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
    // "Мёртвые" синтетические записи в истории безопасны —
    // следующий popstate с пустым стеком просто пропускается.
    set(s => ({ stack: s.stack.filter(l => l.id !== id) }))
  },

  _handlePopState: () => {
    const { stack } = get()

    if (stack.length === 0) {
      // Стек пуст — синтетическая запись осталась от уже закрытого слоя.
      // Ничего не делаем: браузер уже сделал шаг назад, следующий popstate
      // будет либо ещё один наш слой, либо реальный роут Next.js.
      return
    }

    // LIFO: закрываем верхний слой
    const topLayer = stack[stack.length - 1]
    set(s => ({ stack: s.stack.filter(l => l.id !== topLayer.id) }))
    topLayer.closeFn()
  },
}))
