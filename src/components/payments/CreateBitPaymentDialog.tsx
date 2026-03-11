'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { Loader2 } from 'lucide-react'

interface CreateBitPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateBitPaymentDialog({ open, onOpenChange, onSuccess }: CreateBitPaymentDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientId, setClientId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async () => {
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
      const { error } = await supabase
        .from('payments')
        .insert({
          client_id: clientId,
          org_id: orgId,
          amount: parseFloat(amount),
          payment_method: 'bit',
          status: 'completed',
          description: notes || `BIT - ${selectedClient?.first_name} ${selectedClient?.last_name}`,
        })

      if (error) throw error

      toast.success(language === 'he' ? 'תשלום BIT נוצר בהצלחה' : 'BIT платёж успешно создан')
      onOpenChange(false)
      setClientId('')
      setSelectedClient(null)
      setAmount('')
      setNotes('')
      router.refresh()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={language === 'he' ? '📱 תשלום BIT' : '📱 BIT платёж'}
      width="440px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 min-h-[44px] rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isProcessing ? t('common.processing') : t('common.create')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{t('clients.client')}</Label>
          <ClientSearch
            orgId={orgId || ''}
            onSelect={(client) => {
              setSelectedClient(client)
              setClientId(client?.id || '')
            }}
            value={selectedClient}
            placeholder={t('clients.searchClient')}
            locale={language as 'he' | 'ru' | 'en'}
          />
        </div>

        <div>
          <Label htmlFor="amount">{t('payments.amount')}</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="notes">{t('common.notes')}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'he' ? 'הערות נוספות...' : 'Дополнительные заметки...'}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  )
}
