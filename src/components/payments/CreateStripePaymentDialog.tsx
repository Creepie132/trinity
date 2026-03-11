'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ClientSearch } from '@/components/ui/ClientSearch'

interface CreateStripePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStripePaymentDialog({ open, onOpenChange }: CreateStripePaymentDialogProps) {
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const { t, language } = useLanguage()
  const { orgId } = useAuth()

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error(t('payments.selectClient'))
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t('payments.amount'))
      return
    }

    if (!orgId) {
      toast.error('Missing organization')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/payments/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          currency: 'ILS',
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`,
          clientEmail: selectedClient.email || `${selectedClient.phone}@temp.com`,
          clientId: selectedClient.id,
          orgId: orgId,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.open(data.url, '_blank')
        toast.success('Redirecting to Stripe Checkout...')
        handleClose()
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (error) {
      toast.error('Failed to create checkout session')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedClient(null)
    setAmount('')
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${t('payments.createLink')} - Stripe`}
      width="440px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('payments.creating') : t('payments.createLink')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="client">{t('payments.client')} *</Label>
          <ClientSearch
            orgId={orgId || ''}
            onSelect={(client) => setSelectedClient(client)}
            placeholder={t('payments.selectClient')}
            locale={language as 'he' | 'ru' | 'en'}
            value={selectedClient}
          />
        </div>

        <div>
          <Label htmlFor="amount">{t('payments.amount')} (₪) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('payments.amountPlaceholder')}
            required
          />
        </div>
      </div>
    </Modal>
  )
}
