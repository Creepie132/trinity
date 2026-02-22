'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClient) {
      toast.error(t('payments.selectClient'))
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t('payments.amount'))
      return
    }

    if (!selectedClient || !orgId) {
      toast.error('Missing client or organization')
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
        // Open Stripe Checkout in new window
        window.open(data.url, '_blank')
        toast.success('Redirecting to Stripe Checkout...')
        handleClose()
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments.createLink')} - Stripe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {t('payments.creating')}
                </>
              ) : (
                t('payments.createLink')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
