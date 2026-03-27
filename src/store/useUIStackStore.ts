'use client'

/**
 * useUIStackStore — глобальный менеджер UI-слоёв для кнопки "Назад".
 *
 * Паттерн: Synthetic History Entries + LIFO Stack
 *
 * Как работает:
 *   1. Компонент открывается → вызывает registerLayer(id, closeFn)
 *      → в браузерную историю добавляется синтетическая запись
 *        window.history.pushState({ uiLayer: id }, '')
 *   2. Пользователь нажимает "Назад" → срабатывает единый popstate listener
 *      → берём верхний слой из стека → вызываем его closeFn() → удаляем из стека
 *   3. Компонент закрывается программно (крестик / Save) → вызывает unregisterLayer(id)
 *      → под капотом делаем history.back() чтобы убрать синтетическую запись
 *        и не засорять историю "мёртвыми" состояниями
 *
 * ВАЖНО: popstate listener ОДИН, он регистрируется один раз на уровне стора.
 * Хук useMobileBackTrap использует registerLayer / unregisterLayer.
 *
 * Область применения:
 *   - TrinityModalShell (→ все Unified-модалки)
 *   - ModalBottomSheet
 *   - TrinityMob (шторка клиента + drawer действий)
 *   - ClientCard (свайп-действие)
 *   - Любые локальные open-стейты через useMobileBackTrap
 */

import { create } from 'zustand'

export interface UILayer {
  /** Уникальный ID слоя (генерируется хуком) */
  id: string
  /** Функция закрытия компонента */
  closeFn: () => void
}

interface UIStackState {
  /** LIFO стек открытых слоёв */
  stack: UILayer[]
  /** Флаг: глобальный popstate listener уже навешен */
  _listenerAttached: boolean

  /** Регистрирует слой: добавляет в стек + pushState */
  registerLayer: (id: string, closeFn: () => void) => void

  /** Снимает слой: убирает из стека + history.back() для синхронизации */
  unregisterLayer: (id: string, options?: { skipHistoryBack?: boolean }) => void

  /** Внутренний обработчик popstate — вызывается единым listener'ом */
  _handlePopState: () => void

  /** Навешивает единый глобальный popstate listener (вызывать один раз) */
  _attachListener: () => void
}

export const useUIStackStore = create<UIStackState>((set, get) => ({
  stack: [],
  _listenerAttached: false,

  _attachListener: () => {
    if (get()._listenerAttached) return
    if (typeof window === 'undefined') return

    window.addEventListener('popstate', (event: PopStateEvent) => {
      // Срабатывает только если это наша синтетическая запись
      if (event.state && typeof event.state === 'object' && 'uiLayer' in event.state) {
        get()._handlePopState()
      }
      // Иначе — нативная навигация, не трогаем
    })

    set({ _listenerAttached: true })
  },

  registerLayer: (id, closeFn) => {
    // Убеждаемся что listener навешен (ленивая инициализация)
    get()._attachListener()

    // Проверяем — нет ли уже этого id в стеке (защита от двойного вызова)
    const existing = get().stack.find(l => l.id === id)
    if (existing) return

    // Добавляем синтетическую запись в браузерную историю
    if (typeof window !== 'undefined') {
      window.history.pushState({ uiLayer: id }, '')
    }

    set(state => ({
      stack: [...state.stack, { id, closeFn }],
    }))
  },

  unregisterLayer: (id, options) => {
    const state = get()
    const index = state.stack.findIndex(l => l.id === id)
    if (index === -1) return // слой уже удалён

    // Удаляем из стека
    set(s => ({
      stack: s.stack.filter(l => l.id !== id),
    }))

    // Синхронизируем браузерную историю:
    // если слой закрылся НЕ по кнопке "Назад" (т.е. программно),
    // нужно убрать синтетическую запись из истории.
    // skipHistoryBack = true только когда вызываем из _handlePopState
    if (!options?.skipHistoryBack && typeof window !== 'undefined') {
      // history.back() асинхронный — делаем через queueMicrotask чтобы
      // не прерывать React rendering cycle
      queueMicrotask(() => {
        window.history.back()
      })
    }
  },

  _handlePopState: () => {
    const { stack } = get()
    if (stack.length === 0) return

    // Берём верхний слой (LIFO)
    const topLayer = stack[stack.length - 1]

    // Удаляем из стека БЕЗ history.back() — мы уже "назад" от popstate
    set(s => ({
      stack: s.stack.filter(l => l.id !== topLayer.id),
    }))

    // Вызываем функцию закрытия компонента
    topLayer.closeFn()
  },
}))
