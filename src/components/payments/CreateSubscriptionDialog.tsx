'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ClientSearch } from '@/components/ui/ClientSearch'

interface CreateSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Interval = 'month' | 'week' | 'year'

export function CreateSubscriptionDialog({ open, onOpenChange }: CreateSubscriptionDialogProps) {
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [interval, setInterval] = useState<Interval>('month')
  const [loading, setLoading] = useState(false)

  const { t, language } = useLanguage()
  const { orgId } = useAuth()

  const getIntervalLabel = (interval: Interval) => {
    const labels = {
      month: t('subscriptions.monthly'),
      week: t('subscriptions.weekly'),
      year: t('subscriptions.yearly'),
    }
    return labels[interval]
  }

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
      const response = await fetch('/api/payments/stripe-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          interval: interval,
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`,
          clientEmail: selectedClient.email || `${selectedClient.phone}@temp.com`,
          clientId: selectedClient.id,
          orgId: orgId,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.open(data.url, '_blank')
        toast.success(t('common.loading'))
        handleClose()
      } else {
        toast.error(t('common.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedClient(null)
    setAmount('')
    setInterval('month')
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${t('subscriptions.createNew')} - Stripe`}
      width="440px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('subscriptions.creating') : t('subscriptions.create')}
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
          <Label htmlFor="interval">{t('subscriptions.interval')}</Label>
          <Select value={interval} onValueChange={(value) => setInterval(value as Interval)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{getIntervalLabel('week')}</SelectItem>
              <SelectItem value="month">{getIntervalLabel('month')}</SelectItem>
              <SelectItem value="year">{getIntervalLabel('year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">{t('subscriptions.amount')} (₪) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('subscriptions.amountPlaceholder')}
            required
          />
        </div>
      </div>
    </Modal>
  )
}
