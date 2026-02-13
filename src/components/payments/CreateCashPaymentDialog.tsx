'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'

interface CreateCashPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCashPaymentDialog({ open, onOpenChange }: CreateCashPaymentDialogProps) {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { data: clients } = useClients()

  const [clientId, setClientId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId || !amount || parseFloat(amount) <= 0) {
      toast.error(t('common.fillRequired'))
      return
    }

    if (!orgId) {
      toast.error('Organization not found')
      return
    }

    setIsProcessing(true)
    try {
      const client = clients?.find((c) => c.id === clientId)

      const { error } = await supabase
        .from('payments')
        .insert({
          client_id: clientId,
          org_id: orgId,
          amount: parseFloat(amount),
          payment_method: 'cash',
          status: 'completed',
          description: notes || `${t('payments.cashPayment')} - ${client?.first_name} ${client?.last_name}`,
        })

      if (error) throw error

      toast.success(t('payments.cashPaymentSuccess'))
      onOpenChange(false)
      setClientId('')
      setAmount('')
      setNotes('')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating cash payment:', error)
      toast.error(error.message || t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments.cashPayment')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div>
            <Label htmlFor="client">
              {t('visits.client')} <span className="text-red-500">*</span>
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-white dark:bg-gray-800">
                <SelectValue placeholder={t('visits.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                    {client.phone && ` - ${client.phone}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">
              {t('payments.amount')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('common.notes')}
              rows={3}
              className="bg-white dark:bg-gray-800"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
