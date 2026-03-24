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
import { Loader2, Banknote, CheckCircle2 } from 'lucide-react'

interface CreateCashPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateCashPaymentDialog({ open, onOpenChange, onSuccess }: CreateCashPaymentDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const isHe = language === 'he'

  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientId, setClientId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClose = () => {
    setClientId(''); setSelectedClient(null); setAmount(''); setNotes('')
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!clientId || !amount || parseFloat(amount) <= 0) {
      toast.error(t('common.fillRequired')); return
    }
    if (!orgId) { toast.error('Organization not found'); return }
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('payments').insert({
        client_id: clientId, org_id: orgId, amount: parseFloat(amount),
        payment_method: 'cash', status: 'completed',
        description: notes || `${t('payments.cashPayment')} - ${selectedClient?.first_name} ${selectedClient?.last_name}`,
      })
      if (error) throw error
      toast.success(t('payments.cashPaymentSuccess'))
      handleClose(); router.refresh()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    } finally { setIsProcessing(false) }
  }

  const canSubmit = !!clientId && !!amount && parseFloat(amount) > 0

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(34,197,94,0.4)' }}>
          <Banknote size={24} color="#fff" />
        </div>
      </div>
      {/* Amount display */}
      {amount && parseFloat(amount) > 0 ? (
        <div style={{ background: 'rgba(34,197,94,0.12)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e', letterSpacing: '-0.5px' }}>₪{parseFloat(amount).toLocaleString()}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{isHe ? 'לתשלום' : 'К оплате'}</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>₪ —</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{isHe ? 'לתשלום' : 'К оплате'}</div>
        </div>
      )}
      {/* Client */}
      {selectedClient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedClient.first_name} {selectedClient.last_name}
          </span>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 10px' }} />
      <button onClick={handleSubmit} disabled={!canSubmit || isProcessing}
        style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', width: '100%', background: canSubmit && !isProcessing ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.08)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
        {isProcessing ? <Loader2 size={14} /> : <CheckCircle2 size={14} />}
        {isProcessing ? t('common.saving') : t('common.save')}
      </button>
      <button onClick={handleClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {t('common.cancel')}
      </button>
    </div>
  )

  const mobileFooter = (
    <>
      <button onClick={handleClose}
        style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
        {t('common.cancel')}
      </button>
      <button onClick={handleSubmit} disabled={!canSubmit || isProcessing}
        style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#e2e8f0', color: canSubmit ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {isProcessing ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
        {isProcessing ? t('common.saving') : t('common.save')}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0">
      <TrinityModalShell open={open} onClose={handleClose} icon={<Banknote />}
        title={t('payments.cashPayment')}
        subtitle={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : (isHe ? 'בחר לקוח' : 'Выберите клиента')}
        dir={isHe ? 'rtl' : 'ltr'} sidebarExtra={sidebar} footerContent={mobileFooter}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
          {/* Client */}
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {t('visits.client')} *
            </label>
            <ClientSearch orgId={orgId || ''} onSelect={(client) => { setSelectedClient(client); setClientId(client?.id || '') }}
              placeholder={t('visits.selectClient')} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
          </div>
          {/* Amount */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {t('payments.amount')} (₪) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#22c55e', pointerEvents: 'none' }}>₪</span>
              <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
            </div>
          </div>
          {/* Notes */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {t('common.notes')}
            </label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={isHe ? 'הערות נוספות...' : 'Дополнительные заметки...'}
              rows={3} style={{ border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb', resize: 'none', fontSize: 13 }} />
          </div>
        </div>
      </TrinityModalShell>
    </Modal>
  )
}
