'use client'

import { BaseModal } from './BaseModal'
import { useModalStore, ModalType } from '@/store/useModalStore'

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
import { TransferProductModal } from './products/TransferProductModal'

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
const withBaseModal = (ModalContent: React.ComponentType<any>, modalType: ModalType) => {
  return function WrappedModal() {
    const { isModalOpen, closeModal, getModalData } = useModalStore()
    const isOpen = isModalOpen(modalType)
    const data = getModalData(modalType)

    if (!isOpen) return null

    return (
      <BaseModal 
        open={isOpen} 
        onClose={() => closeModal(modalType)}
        modalType={modalType}
      >
        <ModalContent data={data} onClose={() => closeModal(modalType)} />
      </BaseModal>
    )
  }
}

// ClientDetailsModal управляет открытием/закрытием сам через useModalStore
// и рендерит собственный <Modal> внутри — НЕ оборачиваем в withBaseModal/BaseModal
// иначе открывается два окна одновременно: пустой Radix Dialog + Modal с контентом
const StandaloneClientDetailsModal = ClientDetailsModal
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

const EnhancedProductDetailsModal = withBaseModal(ProductDetailsModal, 'product-details')
const EnhancedSellProductModal = withBaseModal(SellProductModal, 'product-sell')
const EnhancedAddStockModal = withBaseModal(AddStockModal, 'product-add-stock')
const EnhancedEditProductModal = withBaseModal(EditProductModal, 'product-edit')
const EnhancedTransferProductModal = withBaseModal(TransferProductModal, 'product-transfer')

const EnhancedCreatePaymentModal = withBaseModal(CreatePaymentModal, 'payment-create')
const EnhancedCreatePaymentLinkModal = withBaseModal(CreatePaymentLinkModal, 'payment-create-link')
const EnhancedCreateCashPaymentModal = withBaseModal(CreateCashPaymentModal, 'payment-create-cash')
const EnhancedCreateStripePaymentModal = withBaseModal(CreateStripePaymentModal, 'payment-create-stripe')
const EnhancedCreateSubscriptionModal = withBaseModal(CreateSubscriptionModal, 'payment-create-subscription')
const EnhancedPaymentDetailsModal = withBaseModal(PaymentDetailsModal, 'payment-details')

const EnhancedCreateServiceModal = withBaseModal(CreateServiceModal, 'service-create')
const EnhancedServiceDetailsModal = withBaseModal(ServiceDetailsModal, 'service-details')

const EnhancedCreateTaskModal = withBaseModal(CreateTaskModal, 'task-create')
const EnhancedTaskDetailsModal = withBaseModal(TaskDetailsModal, 'task-details')

const EnhancedAdminProfileModal = withBaseModal(AdminProfileModal, 'admin-profile')
const EnhancedUserProfileModal = withBaseModal(UserProfileModal, 'user-profile')

const EnhancedCampaignDetailsModal = withBaseModal(CampaignDetailsModal, 'sms-campaign-details')

const EnhancedCareInstructionModal = withBaseModal(CareInstructionModal, 'care-instruction-create')
const EnhancedOrgSubscriptionModal = withBaseModal(OrgSubscriptionModal, 'org-subscription-create')

export function ModalManager() {
  return (
    <>
      {/* Clients — standalone: управляет собственным Modal, не через BaseModal */}
      <StandaloneClientDetailsModal />
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
      <EnhancedProductDetailsModal />
      <EnhancedSellProductModal />
      <EnhancedAddStockModal />
      <EnhancedEditProductModal />
      <EnhancedTransferProductModal />
      
      {/* Payments */}
      <EnhancedCreatePaymentModal />
      <EnhancedCreatePaymentLinkModal />
      <EnhancedCreateCashPaymentModal />
      <EnhancedCreateStripePaymentModal />
      <EnhancedCreateSubscriptionModal />
      <EnhancedPaymentDetailsModal />
      
      {/* Services */}
      <EnhancedCreateServiceModal />
      <EnhancedServiceDetailsModal />
      
      {/* Diary */}
      <EnhancedCreateTaskModal />
      <EnhancedTaskDetailsModal />
      
      {/* Admin */}
      <EnhancedAdminProfileModal />
      <EnhancedUserProfileModal />
      
      {/* SMS */}
      <EnhancedCampaignDetailsModal />
      
      {/* Other */}
      <EnhancedCareInstructionModal />
      <EnhancedOrgSubscriptionModal />
    </>
  )
}