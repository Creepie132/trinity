'use client'

import { BaseModal } from './BaseModal'
import { useModalStore } from '@/store/useModalStore'

// Clients
import { ClientDetailsModal } from './ClientDetailsModal'
import { AddClientModal } from './clients/AddClientModal'
import { EditClientModal } from './clients/EditClientModal'
import { DeleteClientModal } from './clients/DeleteClientModal'
import { SaleModal } from './clients/SaleModal'

// Visits
import { CreateVisitModal } from './visits/CreateVisitModal'
import { EditVisitModal } from './visits/EditVisitModal'
import { CompleteVisitPaymentModal } from './visits/CompleteVisitPaymentModal'
import { AddProductModal } from './visits/AddProductModal'
import { AddServiceModal } from './visits/AddServiceModal'
import { AddServiceDirectModal } from './visits/AddServiceDirectModal'
import { AddToVisitModal } from './visits/AddToVisitModal'

// Products
import { ProductDetailsModal } from './ProductDetailsModal'
import { SellProductModal } from './products/SellProductModal'
import { AddStockModal } from './products/AddStockModal'
import { EditProductModal } from './products/EditProductModal'

// Payments
import { CreatePaymentModal } from './payments/CreatePaymentModal'
import { CreatePaymentLinkModal } from './payments/CreatePaymentLinkModal'
import { CreateCashPaymentModal } from './payments/CreateCashPaymentModal'
import { CreateStripePaymentModal } from './payments/CreateStripePaymentModal'
import { CreateSubscriptionModal } from './payments/CreateSubscriptionModal'
import { PaymentDetailsModal } from './payments/PaymentDetailsModal'

// Services
import { CreateServiceModal } from './services/CreateServiceModal'
import { ServiceDetailsModal } from './services/ServiceDetailsModal'

// Diary
import { CreateTaskModal } from './diary/CreateTaskModal'
import { TaskDetailsModal } from './diary/TaskDetailsModal'

// Admin
import { AdminProfileModal } from './admin/AdminProfileModal'
import { UserProfileModal } from './admin/UserProfileModal'

// SMS
import { CampaignDetailsModal } from './sms/CampaignDetailsModal'

// Other
import { CareInstructionModal } from './other/CareInstructionModal'
import { OrgSubscriptionModal } from './other/OrgSubscriptionModal'

// Примесь для общего поведения модалок
const withBaseModal = (ModalContent: React.ComponentType<any>, modalType: string) => {
  return function WrappedModal() {
    const { isModalOpen, closeModal, getModalData } = useModalStore()
    const isOpen = isModalOpen(modalType)
    const data = getModalData(modalType)

    if (!isOpen) return null

    return (
      <BaseModal 
        open={isOpen} 
        onClose={() => closeModal(modalType)}
      >
        <ModalContent data={data} onClose={() => closeModal(modalType)} />
      </BaseModal>
    )
  }
}

// Оборачиваем все модалки в BaseModal
const EnhancedClientDetailsModal = withBaseModal(ClientDetailsModal, 'client-details')
const EnhancedAddClientModal = withBaseModal(AddClientModal, 'client-add')
const EnhancedEditClientModal = withBaseModal(EditClientModal, 'client-edit')
const EnhancedDeleteClientModal = withBaseModal(DeleteClientModal, 'client-delete')
const EnhancedSaleModal = withBaseModal(SaleModal, 'client-sale')

const EnhancedCreateVisitModal = withBaseModal(CreateVisitModal, 'visit-create')
const EnhancedEditVisitModal = withBaseModal(EditVisitModal, 'edit-visit')
const EnhancedCompleteVisitPaymentModal = withBaseModal(CompleteVisitPaymentModal, 'visit-complete-payment')
const EnhancedAddProductModal = withBaseModal(AddProductModal, 'visit-add-product')
const EnhancedAddServiceModal = withBaseModal(AddServiceModal, 'visit-add-service')
const EnhancedAddServiceDirectModal = withBaseModal(AddServiceDirectModal, 'add-service')
const EnhancedAddToVisitModal = withBaseModal(AddToVisitModal, 'add-to-visit')

export function ModalManager() {
  return (
    <>
      {/* Clients */}
      <EnhancedClientDetailsModal />
      <EnhancedAddClientModal />
      <EnhancedEditClientModal />
      <EnhancedDeleteClientModal />
      <EnhancedSaleModal />
      
      {/* Visits */}
      <EnhancedCreateVisitModal />
      <EnhancedEditVisitModal />
      <EnhancedCompleteVisitPaymentModal />
      <EnhancedAddProductModal />
      <EnhancedAddServiceModal />
      <EnhancedAddServiceDirectModal />
      <EnhancedAddToVisitModal />
      
      {/* Products */}
      <ProductDetailsModal />
      <SellProductModal />
      <AddStockModal />
      <EditProductModal />
      
      {/* Payments */}
      <CreatePaymentModal />
      <CreatePaymentLinkModal />
      <CreateCashPaymentModal />
      <CreateStripePaymentModal />
      <CreateSubscriptionModal />
      <PaymentDetailsModal />
      
      {/* Services */}
      <CreateServiceModal />
      <ServiceDetailsModal />
      
      {/* Diary */}
      <CreateTaskModal />
      <TaskDetailsModal />
      
      {/* Admin */}
      <AdminProfileModal />
      <UserProfileModal />
      
      {/* SMS */}
      <CampaignDetailsModal />
      
      {/* Other */}
      <CareInstructionModal />
      <OrgSubscriptionModal />
    </>
  )
}