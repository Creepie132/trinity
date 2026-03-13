'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface PinnedModal {
  id: string
  title: string
  x: number
  y: number
  zIndex: number
}

interface PinnedModalsStore {
  pinned: PinnedModal[]
  pin: (modal: PinnedModal) => boolean
  unpin: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  isPinned: (id: string) => boolean
  bringToFront: (id: string) => void
  maxPinned: number
}

let baseZ = 200

export const usePinnedModals = create<PinnedModalsStore>()(
  persist(
    (set, get) => ({
      pinned: [],
      maxPinned: 3,

      pin: (modal) => {
        const { pinned, maxPinned } = get()
        if (pinned.length >= maxPinned) return false
        if (pinned.find(p => p.id === modal.id)) return true
        baseZ += 10
        set({ pinned: [...pinned, { ...modal, zIndex: baseZ }] })
        return true
      },

      unpin: (id) => {
        set(s => ({ pinned: s.pinned.filter(p => p.id !== id) }))
      },

      updatePosition: (id, x, y) => {
        set(s => ({
          pinned: s.pinned.map(p => p.id === id ? { ...p, x, y } : p)
        }))
      },

      isPinned: (id) => !!get().pinned.find(p => p.id === id),

      bringToFront: (id) => {
        baseZ += 1
        set(s => ({
          pinned: s.pinned.map(p => p.id === id ? { ...p, zIndex: baseZ } : p)
        }))
      },
    }),
    {
      name: 'trinity-pinned-modals',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage: живёт до закрытия вкладки
    }
  )
)
