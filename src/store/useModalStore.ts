import { create } from 'zustand'

export type ModalType = 
  // Clients
  | 'client-details'
  | 'client-add'
  | 'client-edit'
  | 'client-delete'
  // Visits
  | 'visit-create'
  | 'visit-edit'
  | 'edit-visit'
  | 'visit-complete-payment'
  | 'visit-add-product'
  | 'visit-add-service'
  // Products
  | 'product-create'
  | 'product-details'
  | 'product-edit'
  | 'product-sell'
  | 'product-add-stock'
  | 'product-return'
  | 'quick-sale'
  // Payments
  | 'payment-create'
  | 'payment-create-link'
  | 'payment-create-cash'
  | 'payment-create-stripe'
  | 'payment-create-subscription'
  // Services
  | 'service-create'
  | 'service-details'
  // Diary
  | 'task-create'
  | 'task-details'
  // Admin
  | 'admin-profile'
  | 'user-profile'
  // SMS
  | 'sms-campaign-details'
  // Other
  | 'care-instruction-create'
  | 'org-subscription-create'

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
