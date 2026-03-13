'use client'

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
// PaymentLinkResultModal используется напрямую в SellProductDialog с props, не через useModalStore

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
// CareInstructionSendModal — использует внешние props (isOpen, clientPhone, clientName)
//   рендерится напрямую в ClientDetailsModal и care-instructions компонентах
// EditOrganizationModal — использует внешние props (isOpen, organization)
//   рендерится напрямую в /admin/organizations

/**
 * ModalManager — монтирует все модалки приложения.
 * 
 * АРХИТЕКТУРНОЕ ПРАВИЛО:
 * Каждая модалка управляет собственным открытием/закрытием через useModalStore.
 * НЕ оборачиваем в BaseModal — каждый компонент сам использует Modal/Dialog/Sheet внутри.
 * BaseModal — только для мобайл Sheet, не используется как обёртка здесь.
 */
export function ModalManager() {
  return (
    <>
      {/* Clients */}
      <ClientDetailsModal />
      <AddClientModal />
      <EditClientModal />
      <DeleteClientModal />
      <SaleModal />

      {/* Visits */}
      <CreateVisitModal />
      <EditVisitModal />
      <CompleteVisitPaymentModal />
      <AddProductModal />
      <AddServiceModal />
      <AddServiceDirectModal />
      <AddToVisitModal />

      {/* Products */}
      <ProductDetailsModal />
      <SellProductModal />
      <AddStockModal />
      <EditProductModal />
      {/* TransferProductModal рендерится напрямую в ProductDetailsModal с props */}
      {/* <TransferProductModal /> — убран: не использует useModalStore */}

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
      {/* CareInstructionSendModal и EditOrganizationModal рендерятся напрямую с props */}
    </>
  )
}
