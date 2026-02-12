'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Banknote, Smartphone, CreditCard, Building2, Phone, Zap } from 'lucide-react'

interface Visit {
  id: string
  client_id: string
  service: string
  price: number
  clients: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface CompleteVisitPaymentDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const paymentMethods = [
  { value: 'cash', icon: Banknote, labelKey: 'visits.paymentMethod.cash', emoji: '💵' },
  { value: 'bit', icon: Smartphone, labelKey: 'visits.paymentMethod.bit', emoji: '📱' },
  { value: 'credit', icon: CreditCard, labelKey: 'visits.paymentMethod.credit', emoji: '💳' },
  { value: 'bankTransfer', icon: Building2, labelKey: 'visits.paymentMethod.bankTransfer', emoji: '🏦' },
  { value: 'phoneCredit', icon: Phone, labelKey: 'visits.paymentMethod.phoneCredit', emoji: '📞' },
  { value: 'stripe', icon: Zap, labelKey: 'visits.paymentMethod.stripe', emoji: '🟣' },
]

export function CompleteVisitPaymentDialog({ visit, open, onOpenChange }: CompleteVisitPaymentDialogProps) {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCompleteWithoutPayment = async () => {
    if (!visit || !orgId) return

    setIsProcessing(true)
    try {
      // Update visit status to completed
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'completed' })
        .eq('id', visit.id)

      if (visitError) throw visitError

      toast.success(t('common.success'))
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error completing visit:', error)
      toast.error(t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompleteWithPayment = async () => {
    if (!visit || !orgId) return

    setIsProcessing(true)
    try {
      // For credit card (Tranzilla) or Stripe - create payment link
      if (paymentMethod === 'credit') {
        // Create Tranzilla payment link
        const response = await fetch('/api/payments/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: visit.client_id,
            amount: visit.price,
            description: `${t(getServiceLabelKey(visit.service))} - ${visit.clients.first_name} ${visit.clients.last_name}`,
          }),
        })

        if (!response.ok) throw new Error('Failed to create payment link')

        const { payment_url } = await response.json()

        // Update visit status
        await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', visit.id)

        // Open payment link
        window.open(payment_url, '_blank')
        toast.success(t('payments.successMessage'))
        onOpenChange(false)
        router.refresh()
        return
      }

      if (paymentMethod === 'stripe') {
        // Create Stripe checkout
        const response = await fetch('/api/payments/stripe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: visit.client_id,
            amount: visit.price,
            clientName: `${visit.clients.first_name} ${visit.clients.last_name}`,
            clientEmail: visit.clients.email || '',
            orgId,
          }),
        })

        if (!response.ok) throw new Error('Failed to create Stripe checkout')

        const { url } = await response.json()

        // Update visit status
        await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', visit.id)

        // Open Stripe checkout
        window.open(url, '_blank')
        toast.success(t('payments.successMessage'))
        onOpenChange(false)
        router.refresh()
        return
      }

      // For other methods (cash, bit, bank transfer, phone credit) - create payment record directly
      const paymentMethodMap: Record<string, string> = {
        cash: 'cash',
        bit: 'bit',
        bankTransfer: 'bank_transfer',
        phoneCredit: 'phone_credit',
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          client_id: visit.client_id,
          org_id: orgId,
          amount: visit.price,
          payment_method: paymentMethodMap[paymentMethod],
          status: 'completed',
          description: `${t(getServiceLabelKey(visit.service))} - ${visit.clients.first_name} ${visit.clients.last_name}`,
        })

      if (paymentError) throw paymentError

      // Update visit status
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'completed' })
        .eq('id', visit.id)

      if (visitError) throw visitError

      toast.success(t('common.success'))
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error(t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const getServiceLabelKey = (service: string): string => {
    const serviceMap: Record<string, string> = {
      haircut: 'service.haircut',
      coloring: 'service.coloring',
      smoothing: 'service.smoothing',
      facial: 'service.facial',
      manicure: 'service.manicure',
      pedicure: 'service.pedicure',
      haircutColoring: 'service.haircutColoring',
      hairTreatment: 'service.hairTreatment',
      consultation: 'service.consultation',
      other: 'service.other',
    }
    return serviceMap[service] || 'service.other'
  }

  if (!visit) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t('visits.completeTitle')}</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {t('visits.paymentDetails')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visit details */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.client')}:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {visit.clients.first_name} {visit.clients.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.service')}:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t(getServiceLabelKey(visit.service))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('payments.amount')}:</span>
              <span className="text-lg font-bold text-theme-primary">₪{visit.price}</span>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="space-y-3">
            <Label className="text-gray-900 dark:text-gray-100">{t('visits.selectPaymentMethod')}</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? 'border-theme-primary bg-theme-primary bg-opacity-5'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{method.emoji}</span>
                      <Label
                        htmlFor={method.value}
                        className="cursor-pointer text-gray-900 dark:text-gray-100"
                      >
                        {t(method.labelKey)}
                      </Label>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Note for credit and stripe */}
          {(paymentMethod === 'credit' || paymentMethod === 'stripe') && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 {t('payments.sendLinkToClient')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleCompleteWithPayment}
              disabled={isProcessing}
              className="w-full bg-theme-primary text-white hover:opacity-90"
            >
              {isProcessing ? t('visits.processing') : t('visits.completeAndPay')}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCompleteWithoutPayment}
              disabled={isProcessing}
              className="w-full border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('visits.completeWithoutPayment')}
            </Button>

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
