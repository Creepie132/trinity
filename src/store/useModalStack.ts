'use client'

import { create } from 'zustand'
import { ModalType } from './useModalStore'

interface ModalStackState {
  stack: ModalType[]
  pushModal: (modalType: ModalType) => void
  popModal: () => ModalType | undefined
  clearStack: () => void
  isInStack: (modalType: ModalType) => boolean
  getCurrentModal: () => ModalType | undefined
}

export const useModalStack = create<ModalStackState>((set, get) => ({
  stack: [],

  pushModal: (modalType) => {
    set((state) => {
      // Добавляем в стек только определенные типы модалок
      if (
        modalType.startsWith('client-') || 
        modalType.startsWith('product-') ||
        modalType.startsWith('payment-')
      ) {
        const newStack = [...state.stack, modalType]
        return { stack: newStack }
      }
      return state
    })
  },

  popModal: () => {
    let poppedModal: ModalType | undefined
    set((state) => {
      const newStack = [...state.stack]
      poppedModal = newStack.pop()
      return { stack: newStack }
    })
    return poppedModal
  },

  clearStack: () => set({ stack: [] }),

  isInStack: (modalType) => {
    return get().stack.includes(modalType)
  },

  getCurrentModal: () => {
    const stack = get().stack
    return stack[stack.length - 1]
  }
}))