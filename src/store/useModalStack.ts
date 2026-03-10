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
      // Не добавляем в стек модалки визитов и дневника
      if (
        modalType.startsWith('visit-') || 
        modalType === 'edit-visit' ||
        modalType.startsWith('task-')
      ) {
        return state
      }
      
      const newStack = [...state.stack, modalType]
      // Добавляем в историю браузера только для клиентов, склада и платежей
      window.history.pushState({ modalStack: [...newStack] }, '')
      return { stack: newStack }
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