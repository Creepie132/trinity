'use client'

/**
 * ClientHistoryModal — история визитов или платежей клиента.
 * Открывается через useModalStore('client-history', { client, tab: 'visits'|'payments', locale })
 */

import { useState, useEffect } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { History, CalendarDays, CreditCard, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { getClientName } from '@/lib/client-utils'

interface VisitItem {
  id: string
  scheduled_at: string | null
  started_at: string | null
  status: string
  price: number | null
  service_type: string | null
  visit_services?: { service_name: string | null; service_name_ru: string | null; price: number | null }[]
  services?: { name: string | null; name_ru: string | null } | null
}

interface PaymentItem {
  id: string
  amount: number
  status: string
  description: string | null
  payment_method: string | null
  created_at: string
}

const T = {
  he: {
    visits: 'ביקורים', payments: 'תשלומים', history: 'היסטוריה',
    noVisits: 'אין ביקורים', noPayments: 'אין תשלומים',
    completed: 'הושלם', inProgress: 'בתהליך', scheduled: 'מתוכנן',
    cancelled: 'בוטל', close: 'סגור',
  },
  ru: {
    visits: 'Визиты', payments: 'Платежи', history: 'История',
    noVisits: 'Нет визитов', noPayments: 'Нет платежей',
    completed: 'Завершён', inProgress: 'В процессе', scheduled: 'Запланирован',
    cancelled: 'Отменён', close: 'Закрыть',
  },
}

function statusColor(status: string) {
  if (status === 'completed') return { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' }
  if (status === 'in_progress') return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' }
  if (status === 'cancelled') return { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' }
  return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={13} />
  if (status === 'in_progress') return <Clock size={13} />
  if (status === 'cancelled') return <XCircle size={13} />
  return <CalendarDays size={13} />
}

function payMethodIcon(method: string | null) {
  const m: Record<string, string> = { cash: '💵', bit: '📲', bank_transfer: '🏦', credit_card: '💳' }
  return m[method ?? ''] ?? '💰'
}

export function ClientHistoryModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const isOpen = isModalOpen('client-history')
  const data = getModalData('client-history')

  const client = data?.client
  const locale: 'he' | 'ru' = data?.locale || 'ru'
  const initialTab: 'visits' | 'payments' = data?.tab || 'visits'

  const [tab, setTab] = useState<'visits' | 'payments'>(initialTab)
  const [visits, setVisits] = useState<VisitItem[]>([])
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const t = T[locale]
  const isHe = locale === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const clientName = client ? getClientName(client) : ''

  // Sync tab when modal opens with new tab data
  useEffect(() => { if (isOpen) setTab(data?.tab || 'visits') }, [isOpen, data?.tab])

  useEffect(() => {
    if (!isOpen || !client?.id) return
    if (tab === 'visits' && visits.length === 0) {
      setLoadingVisits(true)
      fetch(`/api/clients/${client.id}/visits?all=true`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setVisits(Array.isArray(d) ? d : []))
        .catch(() => setVisits([]))
        .finally(() => setLoadingVisits(false))
    }
    if (tab === 'payments' && payments.length === 0) {
      setLoadingPayments(true)
      fetch(`/api/clients/${client.id}/payments`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setPayments(Array.isArray(d) ? d : []))
        .catch(() => setPayments([]))
        .finally(() => setLoadingPayments(false))
    }
  }, [isOpen, client?.id, tab])

  // Reset on close
  useEffect(() => {
    if (!isOpen) { setVisits([]); setPayments([]) }
  }, [isOpen])

  if (!isOpen || !client) return null

  const getServiceName = (v: VisitItem) => {
    if (v.visit_services && v.visit_services.length > 0) {
      const s = v.visit_services[0]
      return locale === 'ru' ? (s.service_name_ru || s.service_name) : s.service_name
    }
    if (v.services) return locale === 'ru' ? (v.services.name_ru || v.services.name) : v.services.name
    return v.service_type || null
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, keyof typeof t> = {
      completed: 'completed', in_progress: 'inProgress',
      scheduled: 'scheduled', cancelled: 'cancelled',
    }
    return t[map[status] || 'scheduled'] as string
  }

  return (
    <Modal open={isOpen} onClose={() => closeModal('client-history')}
      darkHeader showCloseButton={false} width="640px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell
        open={isOpen}
        onClose={() => closeModal('client-history')}
        icon={<History />}
        title={clientName}
        subtitle={t.history}
        dir={dir}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['visits', 'payments'] as const).map(tp => (
              <button key={tp} onClick={() => setTab(tp)}
                style={{
                  padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: tab === tp ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  color: tab === tp ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontSize: 12, fontWeight: tab === tp ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                {tp === 'visits' ? <CalendarDays size={13} /> : <CreditCard size={13} />}
                {tp === 'visits' ? t.visits : t.payments}
              </button>
            ))}
          </div>
        }
        footerContent={
          <button onClick={() => closeModal('client-history')}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: '#1e293b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {t.close}
          </button>
        }
      >

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* VISITS TAB */}
          {tab === 'visits' && (
            loadingVisits ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
              </div>
            ) : visits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                <CalendarDays size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>{t.noVisits}</p>
              </div>
            ) : visits.map(v => {
              const sc = statusColor(v.status)
              const date = v.scheduled_at
                ? new Date(v.scheduled_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—'
              const time = v.scheduled_at
                ? new Date(v.scheduled_at).toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
                : null
              const svcName = getServiceName(v)
              return (
                <div key={v.id} style={{ padding: '12px 14px', borderRadius: 12,
                  background: sc.bg, border: `1px solid ${sc.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: sc.bg,
                      border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: sc.color, flexShrink: 0 }}>
                      <StatusIcon status={v.status} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {svcName || (isHe ? 'ביקור' : 'Визит')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {date}{time ? ` · ${time}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {v.price != null && <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>₪{Number(v.price).toLocaleString()}</span>}
                    <span style={{ fontSize: 9, fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {getStatusLabel(v.status)}
                    </span>
                  </div>
                </div>
              )
            })
          )}

          {/* PAYMENTS TAB */}
          {tab === 'payments' && (
            loadingPayments ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
              </div>
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>{t.noPayments}</p>
              </div>
            ) : payments.map(p => {
              const date = new Date(p.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
              const time = new Date(p.created_at).toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={p.id} style={{ padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,0.12)',
                      border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {payMethodIcon(p.payment_method)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.description || (isHe ? 'תשלום' : 'Платёж')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{date} · {time}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399', flexShrink: 0 }}>
                    ₪{Number(p.amount).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </TrinityModalShell>
    </Modal>
  )
}
