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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function urgencyColor(days: number) {
  if (days > 30) return {
    dot: '#ef4444',
    text: '#b91c1c',
    bg: '#fef2f2',
    border: '#fca5a5',
    darkBg: 'rgba(239,68,68,0.12)',
    darkBorder: 'rgba(239,68,68,0.3)',
    darkText: '#fca5a5',
  }
  if (days > 7) return {
    dot: '#f59e0b',
    text: '#b45309',
    bg: '#fffbeb',
    border: '#fcd34d',
    darkBg: 'rgba(245,158,11,0.12)',
    darkBorder: 'rgba(245,158,11,0.3)',
    darkText: '#fcd34d',
  }
  return {
    dot: '#6b7280',
    text: '#374151',
    bg: '#f9fafb',
    border: '#e5e7eb',
    darkBg: 'rgba(107,114,128,0.12)',
    darkBorder: 'rgba(107,114,128,0.3)',
    darkText: '#9ca3af',
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchDebts(
  orgId: string,
  daysFilter: string,
  minAmount: string,
): Promise<{ debts: DebtEntry[]; total: number }> {
  let url = `/api/dashboard/debts?org_id=${orgId}`
  if (daysFilter !== 'all') url += `&days_back=${daysFilter}`
  if (minAmount) url += `&min_amount=${minAmount}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load debts')
  return res.json()
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  debt, isHe, onClose, onWhatsApp, onPaymentLink, onEdit,
}: {
  debt: DebtEntry
  isHe: boolean
  onClose: () => void
  onWhatsApp: (d: DebtEntry) => void
  onPaymentLink: (d: DebtEntry) => void
  onEdit: (d: DebtEntry) => void
}) {
  const urg = urgencyColor(debt.days_ago)

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={{ background: urg.bg, color: urg.text, border: `1px solid ${urg.border}` }}
        >
          {getInitials(debt.first_name, debt.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {debt.first_name} {debt.last_name}
          </div>
          {debt.phone && (
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone size={10} />{debt.phone}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold" style={{ color: urg.text }}>
            ₪{debt.total_debt.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500">
            {isHe ? 'סה״כ חוב' : 'общий долг'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {isHe ? 'פירוט חובות' : 'Задолженности'}
        </div>
        {(debt.items ?? []).length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">{isHe ? 'אין פירוט' : 'Нет детализации'}</div>
        ) : (debt.items ?? []).map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 px-4 py-3 border-t border-gray-50 dark:border-gray-700/60"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.label}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{
                    background: item.type === 'visit' ? '#eff6ff' : '#f0fdf4',
                    color: item.type === 'visit' ? '#1d4ed8' : '#15803d',
                  }}
                >
                  {item.type === 'visit' ? (isHe ? 'ביקור' : 'визит') : (isHe ? 'מכירה' : 'продажа')}
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(item.date).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            <div className="text-sm font-semibold flex-shrink-0" style={{ color: urg.text }}>
              ₪{item.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2">
        <button
          onClick={() => onWhatsApp(debt)}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ background: '#dcfce7', color: '#15803d' }}
        >
          <MessageCircle size={16} />
          {isHe ? 'WA תזכורת' : 'WA-напоминание'}
        </button>
        <button
          onClick={() => onPaymentLink(debt)}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ background: '#eff6ff', color: '#1d4ed8' }}
        >
          <CreditCard size={16} />
          {isHe ? 'קבל תשלום' : 'Принять оплату'}
        </button>
        <button
          onClick={() => onEdit(debt)}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ background: '#f9fafb', color: '#374151' }}
        >
          <Pencil size={16} />
          {isHe ? 'ערוך' : 'Изменить'}
        </button>
      </div>
    </div>
  )
}

// ── DebtsContent ──────────────────────────────────────────────────────────────

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
    queryFn: () => fetchDebts(orgId, daysFilter, minAmount),
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

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleWhatsApp = (debt: DebtEntry) => {
    if (!debt.phone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет телефона'); return }
    const phone = debt.phone.replace(/[^0-9]/g, '')
    const msg = isHe
      ? `שלום ${debt.first_name}, יש לך חוב בסך ₪${debt.total_debt.toLocaleString()}. נשמח להסדיר 🙏`
      : `Здравствуйте, ${debt.first_name}! У вас задолженность ₪${debt.total_debt.toLocaleString()}. Просим оплатить 🙏`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePaymentLink = (debt: DebtEntry) => {
    openModal('payment-unified', {
      clientId:     debt.client_id,
      clientName:   `${debt.first_name} ${debt.last_name}`.trim(),
      clientPhone:  debt.phone,
      prefillAmount: debt.total_debt,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['debts'] })
      },
    })
  }

  const handleEdit = (debt: DebtEntry) => {
    openModal('client-details', { id: debt.client_id })
  }

  const DATE_FILTERS = [
    { value: 'all', ru: 'Все',     he: 'הכל' },
    { value: '7',   ru: '7+ дней', he: '7+ ימים' },
    { value: '30',  ru: '30+ дней', he: '30+ ימים' },
    { value: '90',  ru: '90+ дней', he: '90+ ימים' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20" dir={isHe ? 'rtl' : 'ltr'}>

      {/* Header */}
      {!hideHeader && (
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isHe ? 'חובות' : 'Долги'}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {filtered.length} {isHe ? 'לקוחות' : 'клиентов'} · ₪{total.toLocaleString()} {isHe ? 'סה״כ' : 'всего'}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
            style={{ [isHe ? 'right' : 'left']: 12 }}
          />
          <Input
            placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: isHe ? 40 : 14, paddingLeft: isHe ? 14 : 40 }}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setDaysFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                daysFilter === f.value
                  ? 'bg-theme-primary text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isHe ? f.he : f.ru}
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: table + detail panel ── */}
      <div className="hidden md:flex gap-4 items-start">

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ flex: selected ? '0 0 55%' : '1', transition: 'flex 0.22s ease' }}
        >
          {/* Sub-tabs + counter */}
          <div className="flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-0">
              {(['all', 'visit', 'sale'] as const).map((tab) => {
                const labels: Record<string, { ru: string; he: string }> = {
                  all:   { ru: 'Все',      he: 'הכל' },
                  visit: { ru: 'Визиты',   he: 'ביקורים' },
                  sale:  { ru: 'Продажи',  he: 'מכירות' },
                }
                return (
                  <div key={tab} className="text-xs text-gray-400 dark:text-gray-500 py-2.5 px-3.5">
                    {isHe ? labels[tab].he : labels[tab].ru}
                  </div>
                )
              })}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} {isHe ? 'תוצאות' : 'результатов'}
            </span>
          </div>

          {/* Table head */}
          <div
            className="grid px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider gap-2"
            style={{ gridTemplateColumns: selected ? '1fr 80px 80px 80px' : '1fr 100px 110px 100px 80px' }}
          >
            <span>{isHe ? 'לקוח' : 'Клиент'}</span>
            {!selected && <span className="text-center">{isHe ? 'פריטים' : 'Позиций'}</span>}
            {!selected && <span>{isHe ? 'ותיקות' : 'Давность'}</span>}
            <span className={isHe ? '' : 'text-right'}>{isHe ? 'סכום' : 'Сумма'}</span>
            <span />
          </div>

          {/* Rows */}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 dark:border-gray-700/40 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full" />
                <div className="w-16 h-3 bg-gray-100 dark:bg-gray-700 rounded-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle size={32} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm text-gray-400 dark:text-gray-500">{isHe ? 'אין חובות' : 'Нет долгов'}</p>
            </div>
          ) : filtered.map((debt) => {
            const urg = urgencyColor(debt.days_ago)
            const isActive = selected?.client_id === debt.client_id
            return (
              <div
                key={debt.client_id}
                onClick={() => setSelected(isActive ? null : debt)}
                className="grid items-center gap-2 px-4 cursor-pointer transition-colors border-t border-gray-50 dark:border-gray-700/40"
                style={{
                  gridTemplateColumns: selected ? '1fr 80px 80px 80px' : '1fr 100px 110px 100px 80px',
                  paddingTop: 11, paddingBottom: 11,
                  background: isActive ? 'var(--color-background-secondary, #f9fafb)' : 'transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                    style={{ background: urg.bg, color: urg.text, border: `1px solid ${urg.border}` }}
                  >
                    {getInitials(debt.first_name, debt.last_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">
                      {debt.first_name} {debt.last_name}
                    </div>
                    {debt.phone && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">{debt.phone}</div>
                    )}
                  </div>
                </div>
                {!selected && (
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    {(debt.items ?? []).length}
                  </div>
                )}
                {!selected && (
                  <div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: urg.bg, color: urg.text, border: `1px solid ${urg.border}` }}
                    >
                      {new Date(debt.oldest_debt_date).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                <div className={`text-[13px] font-semibold ${isHe ? '' : 'text-right'}`} style={{ color: urg.text }}>
                  ₪{debt.total_debt.toLocaleString()}
                </div>
                <div className="flex justify-end">
                  <ChevronRight
                    size={14}
                    className="text-gray-300 dark:text-gray-600 transition-transform"
                    style={{ transform: isActive ? 'rotate(90deg)' : 'none' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 min-w-0">
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

      {/* ── MOBILE layout ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex gap-3 items-center animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-3/5" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full w-2/5" />
              </div>
              <div className="w-14 h-4 bg-gray-100 dark:bg-gray-700 rounded-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">{isHe ? 'אין חובות' : 'Нет долгов'}</p>
          </div>
        ) : filtered.map((debt) => {
          const urg = urgencyColor(debt.days_ago)
          const initials = getInitials(debt.first_name, debt.last_name)
          const isExpanded = selected?.client_id === debt.client_id

          return (
            <div
              key={debt.client_id}
              className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
              style={{ border: `1px solid ${urg.border}`, borderInlineStart: `3px solid ${urg.dot}` }}
            >
              {/* Client header row */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                onClick={() => setSelected(isExpanded ? null : debt)}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: urg.bg, color: urg.text, border: `1px solid ${urg.border}` }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {debt.first_name} {debt.last_name}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2">
                    {debt.phone && <span className="flex items-center gap-1"><Phone size={9} />{debt.phone}</span>}
                    <span>{(debt.items ?? []).length} {isHe ? 'פריטים' : 'позиций'}</span>
                    <span>·</span>
                    <span>{new Date(debt.oldest_debt_date).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-bold" style={{ color: urg.text }}>
                    ₪{debt.total_debt.toLocaleString()}
                  </div>
                  <ChevronRight
                    size={14}
                    className="ms-auto mt-0.5 text-gray-300 dark:text-gray-600 transition-transform"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                  />
                </div>
              </div>

              {/* Debt items (always visible: first 2) */}
              {(debt.items ?? []).slice(0, isExpanded ? debt.items.length : 2).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0"
                      style={{
                        background: item.type === 'visit' ? '#eff6ff' : '#f0fdf4',
                        color: item.type === 'visit' ? '#1d4ed8' : '#15803d',
                      }}
                    >
                      {item.type === 'visit' ? (isHe ? 'ביקור' : 'визит') : (isHe ? 'מכירה' : 'продажа')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 flex items-center gap-1">
                      <Calendar size={9} />
                      {new Date(item.date).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: urg.text }}>
                    ₪{item.amount.toLocaleString()}
                  </span>
                </div>
              ))}

              {/* "Show more" toggle when collapsed and items > 2 */}
              {!isExpanded && (debt.items ?? []).length > 2 && (
                <div
                  className="px-4 py-2 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 text-[11px] text-gray-400 dark:text-gray-500 cursor-pointer"
                  onClick={() => setSelected(debt)}
                >
                  + {debt.items.length - 2} {isHe ? 'פריטים נוספים' : 'ещё позиций'}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2 p-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleWhatsApp(debt)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                >
                  <MessageCircle size={14} />
                  WA
                </button>
                <button
                  onClick={() => handlePaymentLink(debt)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: '#eff6ff', color: '#1d4ed8' }}
                >
                  <CreditCard size={14} />
                  {isHe ? 'תשלום' : 'Оплата'}
                </button>
                <button
                  onClick={() => handleEdit(debt)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: '#f3f4f6', color: '#374151' }}
                >
                  <Pencil size={14} />
                  {isHe ? 'ערוך' : 'Изменить'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function DebtsPage() {
  return <DebtsContent />
}
