import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import PaymentList from '@/components/payments/PaymentList'
import PaymentStats from '@/components/payments/PaymentStats'
import { useState } from 'react'
import CreatePaymentSheet from '@/components/payments/CreatePaymentSheet'

export const metadata: Metadata = {
  title: 'Платежи | Trinity CRM'
}

export default function PaymentsPage() {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="container mx-auto py-6 max-w-[95vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Платежи</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Новый платёж
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <PaymentStats />
      </div>

      {/* Payment list */}
      <div className="bg-card rounded-lg border">
        <PaymentList />
      </div>

      {/* Create payment modal */}
      <CreatePaymentSheet 
        open={isCreating}
        onClose={() => setIsCreating(false)}
      />
    </div>
  )
}