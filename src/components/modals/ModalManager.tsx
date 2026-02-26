'use client'

// Clients
import { ClientDetailsModal } from './ClientDetailsModal'
import { AddClientModal } from './clients/AddClientModal'
import { EditClientModal } from './clients/EditClientModal'
import { DeleteClientModal } from './clients/DeleteClientModal'

// Visits
import { CreateVisitModal } from './visits/CreateVisitModal'
import { EditVisitModal } from './visits/EditVisitModal'
import { CompleteVisitPaymentModal } from './visits/CompleteVisitPaymentModal'
import { AddProductModal } from './visits/AddProductModal'
import { AddServiceModal } from './visits/AddServiceModal'

// Products
import { ProductDetailsModal } from './ProductDetailsModal'

// Payments
import { CreatePaymentModal } from './payments/CreatePaymentModal'
import { CreatePaymentLinkModal } from './payments/CreatePaymentLinkModal'
import { CreateCashPaymentModal } from './payments/CreateCashPaymentModal'
import { CreateStripePaymentModal } from './payments/CreateStripePaymentModal'
import { CreateSubscriptionModal } from './payments/CreateSubscriptionModal'

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

export function ModalManager() {
  return (
    <>
      {/* Clients */}
      <ClientDetailsModal />
      <AddClientModal />
      <EditClientModal />
      <DeleteClientModal />
      
      {/* Visits */}
      <CreateVisitModal />
      <EditVisitModal />
      <CompleteVisitPaymentModal />
      <AddProductModal />
      <AddServiceModal />
      
      {/* Products */}
      <ProductDetailsModal />
      
      {/* Payments */}
      <CreatePaymentModal />
      <CreatePaymentLinkModal />
      <CreateCashPaymentModal />
      <CreateStripePaymentModal />
      <CreateSubscriptionModal />
      
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
