'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePaymentLink } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { Copy, ExternalLink, Loader2, Link, MessageCircle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ClientSearch } from '@/components/ui/ClientSearch'
import { useAuth } from '@/hooks/useAuth'

interface CreatePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreatePaymentLinkDialog({ open, onOpenChange, onSuccess }: CreatePaymentLinkDialogProps) {
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const createPayment = useCreatePaymentLink()
  const isHe = language === 'he'

  const handleSubmit = async () => {
    if (!selectedClient) { toast.error(t('payments.selectClient')); return }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) { toast.error(t('payments.amount')); return }
    try {
      const result = await createPayment.mutateAsync({
        client_id: selectedClient.id, amount: amountNum,
        description: description || 'תשלום',
      })
      if (result.success || result.payment_link) {
        setPaymentLink(result.payment_link)
        toast.success(t('payments.successMessage'))
      }
    } catch (error) { console.error('Failed to create payment:', error) }
  }

  const handleClose = () => {
    const was = !!paymentLink
    setSelectedClient(null); setAmount(''); setDescription(''); setPaymentLink(null)
    onOpenChange(false)
    if (was && onSuccess) onSuccess()
  }

  const copyLink = () => { if (paymentLink) { navigator.clipboard.writeText(paymentLink); toast.success(t('payments.linkCopied')) } }
  const openLink = () => { if (paymentLink) window.open(paymentLink, '_blank') }
  const sendWhatsApp = () => {
    if (paymentLink && selectedClient?.phone) {
      let p = selectedClient.phone.replace(/\D/g, '')
      if (p.startsWith('0')) p = p.substring(1)
      const msg = isHe ? `קישור לתשלום: ${paymentLink}` : `Ссылка для оплаты: ${paymentLink}`
      window.open(`https://wa.me/972${p}?text=${encodeURIComponent(msg)}`, '_blank')
    } else {
      toast.error(isHe ? 'אין מספר טלפון ללקוח' : 'У клиента нет номера телефона')
    }
  }

  const canSubmit = !!selectedClient && !!amount && parseFloat(amount) > 0

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: paymentLink ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: paymentLink ? '0 6px 20px rgba(34,197,94,0.4)' : '0 6px 20px rgba(139,92,246,0.4)', transition: 'all 0.3s' }}>
          {paymentLink ? <CheckCircle2 size={24} color="#fff" /> : <Link size={22} color="#fff" />}
        </div>
      </div>
      {/* Amount */}
      {amount && parseFloat(amount) > 0 ? (
        <div style={{ background: paymentLink ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.12)', border: `0.5px solid ${paymentLink ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: paymentLink ? '#22c55e' : '#a78bfa', letterSpacing: '-0.5px' }}>₪{parseFloat(amount).toLocaleString()}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: paymentLink ? '#16a34a' : '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
            {paymentLink ? (isHe ? 'קישור נוצר ✓' : 'Ссылка создана ✓') : (isHe ? 'לתשלום' : 'К оплате')}
          </div>
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
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedClient.first_name} {selectedClient.last_name}
          </span>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 10px' }} />
      {!paymentLink ? (
        <>
          <button onClick={handleSubmit} disabled={!canSubmit || createPayment.isPending}
            style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', width: '100%', background: canSubmit && !createPayment.isPending ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(255,255,255,0.08)', color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {createPayment.isPending ? <Loader2 size={14} /> : <Link size={14} />}
            {createPayment.isPending ? t('payments.creating') : t('payments.createLink')}
          </button>
          <button onClick={handleClose}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
        </>
      ) : (
        <>
          <button onClick={openLink}
            style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ExternalLink size={14} />{t('payments.openLink')}
          </button>
          {selectedClient?.phone && (
            <button onClick={sendWhatsApp}
              style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', cursor: 'pointer', width: '100%', color: '#34d399', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={13} />WhatsApp
            </button>
          )}
          <button onClick={handleClose}
            style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            {t('common.close')}
          </button>
        </>
      )}
    </div>
  )

  const mobileFooter = !paymentLink ? (
    <>
      <button onClick={handleClose}
        style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
        {t('common.cancel')}
      </button>
      <button onClick={handleSubmit} disabled={!canSubmit || createPayment.isPending}
        style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#e2e8f0', color: canSubmit ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {createPayment.isPending ? <Loader2 size={15} /> : <Link size={15} />}
        {createPayment.isPending ? t('payments.creating') : t('payments.createLink')}
      </button>
    </>
  ) : (
    <>
      {selectedClient?.phone && (
        <button onClick={sendWhatsApp}
          style={{ flex: '0 0 auto', padding: '12px 16px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageCircle size={15} />WA
        </button>
      )}
      <button onClick={handleClose}
        style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        {t('common.close')}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0">
      <TrinityModalShell open={open} onClose={handleClose} icon={<Link />}
        title={t('payments.createLink')}
        subtitle={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : (isHe ? 'בחר לקוח' : 'Выберите клиента')}
        dir={isHe ? 'rtl' : 'ltr'} sidebarExtra={sidebar} footerContent={mobileFooter}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-5">
          {!paymentLink ? (
            <>
              {/* Client */}
              <div style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', border: '1px solid #ddd6fe', borderRadius: 14, padding: '14px 16px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  {t('payments.client')} *
                </label>
                <ClientSearch orgId={orgId || ''} onSelect={setSelectedClient}
                  placeholder={t('payments.selectClient')} locale={language as 'he' | 'ru' | 'en'} value={selectedClient} />
              </div>
              {/* Amount */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  {t('payments.amount')} (₪) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#8b5cf6', pointerEvents: 'none' }}>₪</span>
                  <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={t('payments.amountPlaceholder')}
                    style={{ paddingInlineStart: 36, fontSize: 18, fontWeight: 700, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
                </div>
              </div>
              {/* Description */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  {t('payments.description')}
                </label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder={t('payments.descriptionPlaceholder')}
                  rows={3} style={{ border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb', resize: 'none', fontSize: 13 }} />
              </div>
            </>
          ) : (
            /* Success state */
            <div className="space-y-4">
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 6px 16px rgba(34,197,94,0.3)' }}>
                  <CheckCircle2 size={24} color="#fff" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#15803d', margin: '0 0 4px' }}>
                  {isHe ? '✓ הקישור נוצר בהצלחה' : '✓ Ссылка успешно создана'}
                </p>
                <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>
                  {t('payments.sendLinkToClient')}
                </p>
              </div>
              {selectedClient && (
                <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{t('payments.client')}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedClient.first_name} {selectedClient.last_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input value={paymentLink!} readOnly style={{ flex: 1, fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }} />
                <button onClick={copyLink} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                  <Copy size={14} />{t('payments.copy') || 'Копировать'}
                </button>
              </div>
            </div>
          )}
        </div>
      </TrinityModalShell>
    </Modal>
  )
}
