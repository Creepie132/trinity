import { create } from 'zustand'

export type ModalType = 
  // Clients
  | 'client-details'
  | 'client-add'
  | 'client-edit'
  | 'client-delete'
  | 'client-gallery'
  | 'client-documents'
  | 'client-history'
  // Visits — unified entry point
  | 'visit-unified'
  | 'visit-complete-payment'
  | 'visit-add-product'
  | 'visit-add-service'
  | 'add-service'
  | 'add-to-visit'
  // Products — unified (заменяет product-create и product-edit)
  | 'product-unified'
  // product-create и product-edit оставлены для обратной совместимости,
  // оба обслуживаются через EditProductModal → UnifiedProductDialog
  | 'product-create'
  | 'product-details'
  | 'product-edit'
  | 'product-sell'
  | 'product-add-stock'
  | 'product-return'
  | 'product-transfer'
  | 'quick-sale'
  // Sales — unified entry point (replaces client-sale + quick-sale direct usage)
  | 'sale-unified'
  // Payments — unified entry point
  | 'payment-unified'
  | 'payment-details'
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
