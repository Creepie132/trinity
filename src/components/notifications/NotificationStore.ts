// ─── NotificationStore — Zustand ─────────────────────────────────────────────
// Single source of truth for all toast notifications.
// No React dependency — pure Zustand store.

import { create } from 'zustand'
import type { ToastItem, ToastOptions } from './types'

const DEFAULT_DURATIONS = {
  normal: 5000,
  high:   8000,
  urgent: 0,    // persistent — must be manually dismissed
} as const

const MAX_VISIBLE = 4

interface NotificationStore {
  toasts: ToastItem[]
  queue: ToastItem[]

  show: (options: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  pauseToast: (id: string) => void
  resumeToast: (id: string) => void
  _startExit: (id: string) => void
  _remove: (id: string) => void
  _flushQueue: () => void
}

function buildToast(options: ToastOptions): ToastItem {
  const priority = options.priority ?? 'normal'
  return {
    ...options,
    id:         options.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt:  Date.now(),
    isPaused:   false,
    isExiting:  false,
    variant:    options.variant   ?? 'info',
    priority,
    duration:   options.duration  ?? DEFAULT_DURATIONS[priority],
    sound:      options.sound     ?? true,
  }
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  toasts: [],
  queue:  [],

  show(options) {
    const toast = buildToast(options)
    set(state => {
      if (state.toasts.length < MAX_VISIBLE) {
        return { toasts: [toast, ...state.toasts] }
      }
      return { queue: [...state.queue, toast] }
    })
    return toast.id
  },

  dismiss(id) {
    get()._startExit(id)
  },

  dismissAll() {
    const ids = get().toasts.map(t => t.id)
    ids.forEach(id => get()._startExit(id))
  },

  pauseToast(id) {
    set(state => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, isPaused: true } : t),
    }))
  },

  resumeToast(id) {
    set(state => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, isPaused: false } : t),
    }))
  },

  _startExit(id) {
    set(state => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, isExiting: true } : t),
    }))
    setTimeout(() => get()._remove(id), 380)
  },

  _remove(id) {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    get()._flushQueue()
  },

  _flushQueue() {
    set(state => {
      if (state.queue.length === 0) return state
      if (state.toasts.length >= MAX_VISIBLE) return state
      const [next, ...rest] = state.queue
      return { toasts: [next, ...state.toasts], queue: rest }
    })
  },
}))
