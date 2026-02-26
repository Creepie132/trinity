import { create } from 'zustand'

export type ModalType = 
  | 'client-details'
  | 'client-edit'
  | 'visit-create'
  | 'product-create'
  | 'product-details'
  | 'product-sell'
  | 'product-add-stock'
  | 'product-return'
  | 'quick-sale'

interface ModalData {
  [key: string]: any
}

interface ModalState {
  modals: Map<ModalType, { isOpen: boolean; data?: ModalData }>
  openModal: (type: ModalType, data?: ModalData) => void
  closeModal: (type: ModalType) => void
  closeAllModals: () => void
  isModalOpen: (type: ModalType) => boolean
  getModalData: (type: ModalType) => ModalData | undefined
}

export const useModalStore = create<ModalState>((set, get) => ({
  modals: new Map(),

  openModal: (type, data) => {
    set((state) => {
      const newModals = new Map(state.modals)
      newModals.set(type, { isOpen: true, data })
      return { modals: newModals }
    })
  },

  closeModal: (type) => {
    set((state) => {
      const newModals = new Map(state.modals)
      newModals.set(type, { isOpen: false, data: undefined })
      return { modals: newModals }
    })
  },

  closeAllModals: () => {
    set({ modals: new Map() })
  },

  isModalOpen: (type) => {
    const modal = get().modals.get(type)
    return modal?.isOpen ?? false
  },

  getModalData: (type) => {
    const modal = get().modals.get(type)
    return modal?.data
  },
}))
