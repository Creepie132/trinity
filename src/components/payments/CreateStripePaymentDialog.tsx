'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CreateStripePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStripePaymentDialog({ open, onOpenChange }: CreateStripePaymentDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const { t } = useLanguage()
  const { data: clients } = useClients()
  const { orgId } = useAuth()

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (!searchQuery) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.phone.includes(query)
    )
  }, [clients, searchQuery])

  const selectedClient = clients?.find((c) => c.id === selectedClientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
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
          clientId: selectedClientId,
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
    setSelectedClientId('')
    setAmount('')
    setSearchQuery('')
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
            <div className="space-y-2">
              <Input
                placeholder={t('clients.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('payments.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
