'use client'

/**
 * useUIStackStore — глобальный менеджер UI-слоёв для кнопки "Назад".
 *
 * ═══════════════════════════════════════════════════════════════════
 * АРХИТЕКТУРА v5 — симметричный pushState / go(-1)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Ключевой принцип: history — стек. Мы его явно балансируем.
 *
 * registerLayer:   pushState({ uiLayer: id })   — +1 запись в history
 * unregisterLayer: programmatic = true → go(-1) — -1 запись из history
 *                  (флаг _skipNextPopState подавляет наш обработчик
 *                   пока history.go(-1) асинхронно срабатывает)
 *
 * _handlePopState (аппаратная «Назад»):
 *   1. replaceState — восстанавливаем URL (Next.js не навигирует)
 *   2. Закрываем верхний слой через closeFn
 *   (closeFn → unregisterLayer с programmatic=false — не делаем go(-1),
 *    т.к. popstate уже "потратил" эту запись)
 *
 * Итог: количество записей в history всегда == stack.length.
 * Накопления "призрачных" записей не происходит.
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
  _skipNextPopState: boolean

  registerLayer:   (id: string, closeFn: () => void) => void
  unregisterLayer: (id: string, programmatic?: boolean) => void
  _handlePopState: (event: PopStateEvent) => void
  _attachListener: () => void
}

export const useUIStackStore = create<UIStackState>((set, get) => ({
  stack: [],
  _listenerAttached: false,
  _currentUrl: '',
  _skipNextPopState: false,

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

    // Только на мобильных — десктоп не нуждается в перехвате
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return

    const currentUrl = window.location.href
    window.history.pushState({ uiLayer: id }, '', currentUrl)

    console.log('[UIStack] registerLayer:', id, '| historyDepth=', get().stack.length + 1)
    set(s => ({ stack: [...s.stack, { id, closeFn }], _currentUrl: currentUrl }))
  },

  unregisterLayer: (id, programmatic = true) => {
    const { stack } = get()
    const exists = stack.some(l => l.id === id)
    if (!exists) return

    console.log('[UIStack] unregisterLayer:', id, '| programmatic=', programmatic)
    set(s => ({ stack: s.stack.filter(l => l.id !== id) }))

    if (programmatic && typeof window !== 'undefined') {
      // Убираем соответствующую pushState-запись из истории.
      // Ставим флаг, чтобы следующий popstate-событие (вызванный go(-1))
      // был проигнорирован нашим обработчиком — это не аппаратная «Назад».
      set({ _skipNextPopState: true })
      window.history.go(-1)
    }
  },

  _handlePopState: (event: PopStateEvent) => {
    // Это programmatic go(-1) от unregisterLayer — пропускаем.
    if (get()._skipNextPopState) {
      console.log('[UIStack] skip programmatic popstate')
      set({ _skipNextPopState: false })
      return
    }

    const { stack, _currentUrl } = get()
    console.log('[UIStack] popstate. stack=', stack.map(l => l.id), '| state=', event.state)

    if (stack.length === 0) {
      // Мёртвая запись (не наша) — ничего не делаем, даём Next.js обработать
      console.log('[UIStack] empty stack — pass through to Next.js')
      return
    }

    // Синхронно восстанавливаем URL — Next.js видит тот же URL → не навигирует
    const url = _currentUrl || window.location.href
    console.log('[UIStack] intercepting popstate — replaceState to', url)
    window.history.replaceState({ uiLayer: stack[stack.length - 1].id }, '', url)

    // Закрываем верхний слой.
    // closeFn → unregisterLayer(id, programmatic=false) — не вызывает go(-1)
    // т.к. popstate уже "потратил" эту запись из history.
    const topLayer = stack[stack.length - 1]
    console.log('[UIStack] closing top layer:', topLayer.id)
    set(s => ({ stack: s.stack.filter(l => l.id !== topLayer.id) }))
    topLayer.closeFn()
  },
}))
