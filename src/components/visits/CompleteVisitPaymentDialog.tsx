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
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Banknote, Smartphone, CreditCard, Building2, Phone, Zap } from 'lucide-react'
import { Visit } from '@/types/visits'

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
            amount: visit.price || 0,
            description: `${t(getServiceLabelKey(visit.service_type || visit.service || 'other'))} - ${visit.clients?.first_name} ${visit.clients?.last_name}`,
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
            amount: visit.price || 0,
            clientName: `${visit.clients?.first_name} ${visit.clients?.last_name}`,
            clientEmail: visit.clients?.email || '',
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
          amount: visit.price || 0,
          payment_method: paymentMethodMap[paymentMethod],
          status: 'completed',
          description: `${t(getServiceLabelKey(visit.service_type || visit.service || 'other'))} - ${visit.clients?.first_name} ${visit.clients?.last_name}`,
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
      <DialogContent className="max-w-md md:max-h-[90vh] h-full md:h-auto bg-white dark:bg-gray-800 p-0 md:p-6">
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 md:p-0 border-b md:border-b-0 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl text-gray-900 dark:text-gray-100">{t('visits.completeTitle')}</DialogTitle>
            <DialogDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {t('visits.paymentDetails')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col h-full md:h-auto">
          <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-4">
          {/* Visit details */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
            {/* Large price on top for mobile */}
            <div className="text-center md:hidden">
              <div className="text-4xl font-bold text-theme-primary mb-1">₪{visit.price || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('payments.amount')}</div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.client')}:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {visit.clients?.first_name} {visit.clients?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.service')}:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t(getServiceLabelKey(visit.service_type || visit.service || 'other'))}
              </span>
            </div>
            
            {/* Desktop price */}
            <div className="hidden md:flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('payments.amount')}:</span>
              <span className="text-lg font-bold text-theme-primary">₪{visit.price || 0}</span>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="space-y-3">
            <Label className="text-gray-900 dark:text-gray-100">{t('visits.selectPaymentMethod')}</Label>
            
            {/* Mobile: 2 columns grid with big cards */}
            <div className="grid grid-cols-2 md:hidden gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.value}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[100px] ${
                    paymentMethod === method.value
                      ? 'border-theme-primary bg-theme-primary bg-opacity-10'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => setPaymentMethod(method.value)}
                >
                  <span className="text-3xl mb-2">{method.emoji}</span>
                  <span className="text-xs text-center text-gray-900 dark:text-gray-100 font-medium">
                    {t(method.labelKey)}
                  </span>
                  {paymentMethod === method.value && (
                    <Check className="w-4 h-4 text-theme-primary mt-1" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Desktop: stacked list */}
            <div className="hidden md:block space-y-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <div
                    key={method.value}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? 'border-theme-primary bg-theme-primary bg-opacity-5'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{method.emoji}</span>
                      <span className="cursor-pointer text-gray-900 dark:text-gray-100">
                        {t(method.labelKey)}
                      </span>
                    </div>
                    {paymentMethod === method.value && (
                      <Check className="w-5 h-5 text-theme-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note for credit and stripe */}
          {(paymentMethod === 'credit' || paymentMethod === 'stripe') && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 {t('payments.sendLinkToClient')}
              </p>
            </div>
          )}
          </div>

          {/* Actions - Fixed at bottom on mobile */}
          <div className="sticky md:static bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 md:p-0 border-t border-gray-200 dark:border-gray-700 mt-4 md:pt-4 flex flex-col gap-2">
            <Button
              onClick={handleCompleteWithPayment}
              disabled={isProcessing}
              className="w-full h-11 md:h-10 bg-theme-primary text-white hover:opacity-90"
            >
              {isProcessing ? t('visits.processing') : t('visits.completeAndPay')}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCompleteWithoutPayment}
              disabled={isProcessing}
              className="w-full h-11 md:h-10 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('visits.completeWithoutPayment')}
            </Button>

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="w-full h-11 md:h-10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
