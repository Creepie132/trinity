'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useModalStore } from '@/store/useModalStore'
import {
  Search, AlertCircle, MessageCircle, CreditCard,
  Pencil, ChevronRight, X, Phone, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

// ── Types ────────────────────────────────────────────────────────────────────

interface DebtItem {
  id: string
  type: 'visit' | 'sale'
  label: string
  date: string
  amount: number
  days_ago: number
}

interface DebtEntry {
  client_id: string
  first_name: string
  last_name: string
  phone: string
  total_debt: number
  oldest_debt_date: string
  days_ago: number
  items: DebtItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function urgencyColor(days: number): { dot: string; text: string; bg: string; border: string } {
  if (days > 30) return {
    dot: '#E24B4A',
    text: 'var(--color-text-danger, #b91c1c)',
    bg: 'var(--color-background-danger, #fef2f2)',
    border: 'var(--color-border-danger, #fca5a5)',
  }
  if (days > 7) return {
    dot: '#EF9F27',
    text: 'var(--color-text-warning, #b45309)',
    bg: 'var(--color-background-warning, #fffbeb)',
    border: 'var(--color-border-warning, #fcd34d)',
  }
  return {
    dot: '#888',
    text: 'var(--color-text-secondary)',
    bg: 'var(--color-background-secondary)',
    border: 'var(--color-border-secondary)',
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchDebts(orgId: string, search: string, daysFilter: string, minAmount: string): Promise<{ debts: DebtEntry[]; total: number }> {
  let url = `/api/dashboard/debts?org_id=${orgId}`
  if (daysFilter !== 'all') url += `&days_back=${daysFilter}`
  if (minAmount) url += `&min_amount=${minAmount}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load debts')
  const data = await res.json()
  return data
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  debt,
  isHe,
  onClose,
  onWhatsApp,
  onPaymentLink,
  onEdit,
}: {
  debt: DebtEntry
  isHe: boolean
  onClose: () => void
  onWhatsApp: (d: DebtEntry) => void
  onPaymentLink: (d: DebtEntry) => void
  onEdit: (d: DebtEntry) => void
}) {
  const urg = urgencyColor(debt.days_ago)
  const initials = getInitials(debt.first_name, debt.last_name)

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: urg.bg, border: `0.5px solid ${urg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 500, color: urg.text, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {debt.first_name} {debt.last_name}
          </div>
          {debt.phone && (
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={10} />{debt.phone}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: urg.text }}>
            ₪{debt.total_debt.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {isHe ? 'סה״כ חוב' : 'общий долг'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '0.5px solid var(--color-border-tertiary)',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-secondary)', flexShrink: 0,
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          padding: '8px 16px 4px',
          fontSize: 10, fontWeight: 500,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {isHe ? 'פירוט חובות' : 'Задолженности'}
        </div>
        {(debt.items ?? []).length === 0 ? (
          <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {isHe ? 'אין פירוט' : 'Нет детализации'}
          </div>
        ) : (debt.items ?? []).map((item) => (
          <div key={item.id} style={{
            padding: '10px 16px',
            borderTop: '0.5px solid var(--color-border-tertiary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{
                  fontSize: 10,
                  background: item.type === 'visit' ? 'var(--color-background-info)' : 'var(--color-background-success)',
                  color: item.type === 'visit' ? 'var(--color-text-info)' : 'var(--color-text-success)',
                  padding: '1px 6px', borderRadius: 4,
                }}>
                  {item.type === 'visit' ? (isHe ? 'ביקור' : 'визит') : (isHe ? 'מכירה' : 'продажа')}
                </span>
                <Calendar size={10} />
                {new Date(item.date).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}
                · {item.days_ago} {isHe ? 'ימים' : 'дн.'}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: urg.text, flexShrink: 0 }}>
              ₪{item.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        padding: '12px 16px',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
      }}>
        <button
          onClick={() => onWhatsApp(debt)}
          style={{
            padding: '8px 4px', border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md)', background: 'transparent',
            cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <MessageCircle size={13} />
          {isHe ? 'WA תזכורת' : 'WA-напоминание'}
        </button>
        <button
          onClick={() => onPaymentLink(debt)}
          style={{
            padding: '8px 4px', border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md)', background: 'transparent',
            cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <CreditCard size={13} />
          {isHe ? 'קבל תשלום' : 'Принять оплату'}
        </button>
        <button
          onClick={() => onEdit(debt)}
          style={{
            padding: '8px 4px', border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md)', background: 'transparent',
            cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Pencil size={13} />
          {isHe ? 'ערוך' : 'Изменить'}
        </button>
      </div>
    </div>
  )
}

// ── Debts Content (экспортируется для использования в /payments как вкладка) ──

export function DebtsContent({ hideHeader = false }: { hideHeader?: boolean }) {
  const { orgId: authOrgId } = useAuth()
  const { activeOrgId } = useBranch()
  const orgId = activeOrgId || authOrgId || ''
  const { language } = useLanguage()
  const isHe = language === 'he'
  const { openModal } = useModalStore()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [daysFilter, setDaysFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [selected, setSelected] = useState<DebtEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['debts', orgId, daysFilter, minAmount],
    queryFn: () => fetchDebts(orgId, search, daysFilter, minAmount),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const debts = data?.debts ?? []
  const total = data?.total ?? 0

  const filtered = useMemo(() => {
    if (!search.trim()) return debts
    const q = search.toLowerCase()
    return debts.filter(d =>
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
      d.phone?.includes(q)
    )
  }, [debts, search])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleWhatsApp = (debt: DebtEntry) => {
    if (!debt.phone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет телефона'); return }
    const phone = debt.phone.replace(/[^0-9]/g, '')
    const msg = isHe
      ? `שלום ${debt.first_name}, יש לך חוב בסך ₪${debt.total_debt.toLocaleString()}. נשמח להסדיר 🙏`
      : `Здравствуйте, ${debt.first_name}! У вас задолженность ₪${debt.total_debt.toLocaleString()}. Просим оплатить 🙏`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePaymentLink = async (debt: DebtEntry) => {
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: debt.client_id,
          amount: debt.total_debt,
          description: isHe ? `סילוק חוב` : `Погашение долга`,
        }),
      })
      if (!res.ok) throw new Error()
      const { payment_url } = await res.json()
      if (payment_url && debt.phone) {
        const phone = debt.phone.replace(/[^0-9]/g, '')
        const msg = isHe
          ? `שלום ${debt.first_name}, לתשלום חוב ₪${debt.total_debt.toLocaleString()}: ${payment_url}`
          : `Здравствуйте, ${debt.first_name}! Ссылка для оплаты ₪${debt.total_debt.toLocaleString()}: ${payment_url}`
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
      }
      toast.success(isHe ? 'נשלח' : 'Отправлено')
    } catch {
      toast.error(isHe ? 'שגיאה' : 'Ошибка')
    }
  }

  const handleEdit = (debt: DebtEntry) => {
    openModal('client-details', { clientId: debt.client_id })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const DATE_FILTERS = [
    { value: 'all', ru: 'Все', he: 'הכל' },
    { value: '7',  ru: '7+ дней', he: '7+ ימים' },
    { value: '30', ru: '30+ дней', he: '30+ ימים' },
    { value: '90', ru: '90+ дней', he: '90+ ימים' },
  ]

  return (
    <div className="space-y-5 pb-20" dir={isHe ? 'rtl' : 'ltr'}>

      {/* Header */}
      {!hideHeader && (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isHe ? 'חובות' : 'Долги'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {filtered.length} {isHe ? 'לקוחות' : 'клиентов'} · ₪{total.toLocaleString()} {isHe ? 'סה״כ' : 'всего'}
        </p>
      </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" style={{ [isHe ? 'right' : 'left']: 10, position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
          <Input
            placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: isHe ? 36 : 12, paddingLeft: isHe ? 12 : 36 }}
            className="bg-white dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDaysFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                daysFilter === f.value
                  ? 'bg-theme-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isHe ? f.he : f.ru}
            </button>
          ))}
        </div>
      </div>

      {/* Main: table + detail panel */}
      <div className="hidden md:flex gap-4 items-start">

        {/* Table */}
        <div style={{
          flex: selected ? '0 0 55%' : '1',
          transition: 'flex 0.22s ease',
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
        }}>
          {/* Table header tabs */}
          <div style={{
            padding: '0 16px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {(['all', 'visit', 'sale'] as const).map((tab) => {
                const labels: Record<string, { ru: string; he: string }> = {
                  all:  { ru: 'Все', he: 'הכל' },
                  visit: { ru: 'Визиты', he: 'ביקורים' },
                  sale:  { ru: 'Продажи', he: 'מכירות' },
                }
                return (
                  <div key={tab} style={{
                    fontSize: 12, padding: '10px 14px 9px',
                    color: 'var(--color-text-secondary)',
                    cursor: 'default',
                  }}>
                    {isHe ? labels[tab].he : labels[tab].ru}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {filtered.length} {isHe ? 'תוצאות' : 'результатов'}
            </span>
          </div>

          {/* Table head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: selected ? '1fr 80px 90px 90px' : '1fr 110px 100px 100px 90px',
            padding: '7px 16px',
            background: 'var(--color-background-secondary)',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            fontSize: 11, fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            gap: 8,
          }}>
            <span>{isHe ? 'לקוח' : 'Клиент'}</span>
            {!selected && <span style={{ textAlign: 'center' }}>{isHe ? 'פריטים' : 'Позиций'}</span>}
            {!selected && <span>{isHe ? 'ותיקות' : 'Давность'}</span>}
            <span style={{ textAlign: isHe ? 'left' : 'right' }}>{isHe ? 'סכום' : 'Сумма'}</span>
            <span></span>
          </div>

          {/* Rows */}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-background-secondary)' }} />
                <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--color-background-secondary)' }} />
                <div style={{ width: 60, height: 12, borderRadius: 4, background: 'var(--color-background-secondary)' }} />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{isHe ? 'אין חובות' : 'Нет долгов'}</p>
            </div>
          ) : filtered.map((debt) => {
            const urg = urgencyColor(debt.days_ago)
            const isActive = selected?.client_id === debt.client_id
            return (
              <div
                key={debt.client_id}
                onClick={() => setSelected(isActive ? null : debt)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: selected ? '1fr 80px 90px 90px' : '1fr 110px 100px 100px 90px',
                  padding: '11px 16px',
                  borderTop: '0.5px solid var(--color-border-tertiary)',
                  cursor: 'pointer',
                  gap: 8,
                  alignItems: 'center',
                  background: isActive ? 'var(--color-background-secondary)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-secondary)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Client */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: urg.bg, border: `0.5px solid ${urg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 500, color: urg.text,
                  }}>
                    {getInitials(debt.first_name, debt.last_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {debt.first_name} {debt.last_name}
                    </div>
                    {debt.phone && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{debt.phone}</div>
                    )}
                  </div>
                </div>

                {/* Позиций */}
                {!selected && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {(debt.items ?? []).length}
                  </div>
                )}

                {/* Давность */}
                {!selected && (
                  <div>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: urg.bg, color: urg.text, border: `0.5px solid ${urg.border}`,
                    }}>
                      {debt.days_ago} {isHe ? 'ימים' : 'дн.'}
                    </span>
                  </div>
                )}

                {/* Сумма */}
                <div style={{
                  textAlign: isHe ? 'left' : 'right',
                  fontSize: 13, fontWeight: 500, color: urg.text,
                }}>
                  ₪{debt.total_debt.toLocaleString()}
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ChevronRight size={14}
                    style={{
                      color: 'var(--color-text-tertiary)',
                      transform: isActive ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: '0 0 44%', minWidth: 0, position: 'sticky', top: 80 }}>
            <DetailPanel
              debt={selected}
              isHe={isHe}
              onClose={() => setSelected(null)}
              onWhatsApp={handleWhatsApp}
              onPaymentLink={handlePaymentLink}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>

      {/* Mobile placeholder */}
      <div className="md:hidden">
        <p className="text-sm text-gray-400 text-center py-8">
          {isHe ? 'גרסת מובייל בקרוב' : 'Мобильная версия — скоро'}
        </p>
      </div>

    </div>
  )
}

export default function DebtsPage() {
  return <DebtsContent />
}
