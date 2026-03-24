'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { Loader2, Smartphone } from 'lucide-react'

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
      darkHeader
      width="680px"
      dir={language === 'he' ? 'rtl' : 'ltr'}
      contentClassName="!p-0"
    >
      <TrinityModalShell
        open={open}
        onClose={() => onOpenChange(false)}
        icon={<Smartphone />}
        title={language === 'he' ? 'תשלום BIT' : 'BIT платёж'}
        subtitle={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : (language === 'he' ? 'בחר לקוח' : 'Выберите клиента')}
        dir={language === 'he' ? 'rtl' : 'ltr'}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              style={{ padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: isProcessing ? 'rgba(255,255,255,0.15)' : '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, opacity: isProcessing ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isProcessing && <Loader2 style={{ width: 14, height: 14 }} />}
              {isProcessing ? t('common.processing') : t('common.create')}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        }
      >
      <div className="space-y-4" style={{ padding: '16px 16px 20px' }}>
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
      </TrinityModalShell>
    </Modal>
  )
}
