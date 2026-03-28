'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Search, SlidersHorizontal, Receipt, FileText, Banknote, CheckCircle, TrendingUp, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePayments, usePaymentsStats } from '@/hooks/usePayments'
import { useQueryClient } from '@tanstack/react-query'
import { PaymentReportModal } from '@/components/payments/PaymentReportModal'
import { CreateBitPaymentDialog } from '@/components/payments/CreateBitPaymentDialog'
import { useModalStore } from '@/store/useModalStore'
import { PaymentCard } from '@/components/payments/PaymentCard'
import { PaymentDetailsDrawer } from '@/components/payments/PaymentDetailsDrawer'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawerLazy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoStub, DemoStubConfig } from '@/components/demo/DemoStub'
import { getCanonicalMethodCfg, normalizePaymentMethod } from '@/lib/payment-method-normalizer'

const PAGE_SIZE = 20

// ─── Методы оплаты: делегируем нормализатору (fixes дубли card/credit_card, transfer/bank_transfer) ──
function getMethodCfg(m: string) { return getCanonicalMethodCfg(m) }

// ─── BarChart (мини, как в Продажах) ─────────────────────────────────────────
function MiniBarChart({ payments, locale }: { payments: any[]; locale: string }) {
  const isHe = locale === 'he'
  const [mounted, setMounted] = useState(false)

  const bars = useMemo(() => {
    const map: Record<string, number> = {}
    payments.forEach(p => {
      if (p.status !== 'completed') return
      const m = (p.paid_at || p.created_at || '').slice(0, 7)
      if (!m) return
      map[m] = (map[m] || 0) + Number(p.amount || 0)
    })
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { month: 'short' })
      return { label, value: map[key] ?? 0, key }
    })
  }, [payments, isHe])

  useEffect(() => {
    setMounted(false)
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [bars])

  const max = Math.max(...bars.map(b => b.value), 1)
  const CHART_H = 52

  return (
    <div className="flex items-end gap-1.5" style={{ height: '60px' }}>
      {bars.map((b, i) => {
        const isEmpty = b.value === 0
        const barH = isEmpty ? 2 : Math.max(Math.round((b.value / max) * CHART_H), 3)
        const isLast = i === bars.length - 1
        return (
          <div key={b.key} className="flex flex-col items-center justify-end gap-1 flex-1 cursor-default"
            style={{ height: '60px' }} title={isEmpty ? '₪0' : `₪${b.value.toLocaleString()}`}>
            <div className="w-full rounded-t-sm transition-all duration-700" style={{
              height: mounted ? `${barH}px` : '2px',
              background: isEmpty ? 'transparent' : isLast ? 'linear-gradient(to top,#f59e0b,#fbbf24)' : 'rgba(251,191,36,.35)',
              border: isEmpty ? '1px dashed rgba(203,213,225,0.4)' : 'none',
              borderBottom: isEmpty ? '1px dashed rgba(203,213,225,0.4)' : 'none',
              boxShadow: (!isEmpty && isLast) ? '0 -2px 8px rgba(245,158,11,.35)' : 'none',
              transitionDelay: `${i * 80}ms`,
            }} />
            <span style={{ fontSize: 8, color: isLast && !isEmpty ? '#f59e0b' : 'rgba(255,255,255,.25)' }}>{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── PaymentRow (десктоп) ─────────────────────────────────────────────────────
function PaymentRow({ payment, locale, index, onClick }: {
  payment: any; locale: string; index: number; onClick: () => void
}) {
  const method = payment.payment_method || payment.method || 'other'
  const cfg = getMethodCfg(method)
  const clientName =
    payment.client_name ||
    (payment.clients ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim() : null) ||
    (locale === 'he' ? 'ללא לקוח' : 'Без клиента')

  const statusDot: Record<string, string> = {
    completed: '#22c55e', pending: '#f59e0b', failed: '#ef4444', refunded: '#9ca3af', cancelled: '#9ca3af',
  }
  const statusText: Record<string, Record<string, string>> = {
    completed: { ru: 'Оплачено', he: 'שולם' },
    pending:   { ru: 'Ожидает',  he: 'ממתין' },
    failed:    { ru: 'Ошибка',   he: 'נכשל' },
    refunded:  { ru: 'Возврат',  he: 'הוחזר' },
    cancelled: { ru: 'Отменён',  he: 'בוטל' },
  }
  const dateStr = payment.paid_at || payment.created_at || ''
  const dateShort = dateStr ? new Date(dateStr).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' }) : '—'

  return (
    <div onClick={onClick} className="grid items-center px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700/40 last:border-0"
      style={{ gridTemplateColumns: '1fr auto auto auto', borderInlineStart: `2.5px solid ${cfg.color}`, animation: `slideInRow 0.35s ${index * 0.04}s ease both` }}>
      <div className="min-w-0 pe-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
            {(clientName[0] || '?').toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{clientName}</span>
          {(payment.sale_id || payment.sales?.id) && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/60 flex-shrink-0">
              {locale === 'he' ? 'עסקה' : 'Сделка'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ps-8">{cfg.label[locale as 'ru' | 'he']}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap px-2 tabular-nums">{dateShort}</span>
      <div className="text-right px-2">
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">₪{Number(payment.amount).toLocaleString()}</div>
      </div>
      <div className="flex items-center gap-1.5 ps-1">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusDot[payment.status] || '#9ca3af' }} />
        <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: statusDot[payment.status] || '#9ca3af' }}>
          {statusText[payment.status]?.[locale] || payment.status}
        </span>
      </div>
    </div>
  )
}

// ─── PaymentsContent ──────────────────────────────────────────────────────────
function PaymentsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const { data: isAdmin } = useIsAdmin()
  const { t, language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const queryClient = useQueryClient()

  const { openModal } = useModalStore()

  const [reportModalOpen, setReportModalOpen]     = useState(false)
  const [bitDialogOpen, setBitDialogOpen]         = useState(false)
  const [filtersOpen, setFiltersOpen]             = useState(false)
  const [statusFilter, setStatusFilter]           = useState('all')
  const [methodFilter, setMethodFilter]           = useState('all')
  const [startDate, setStartDate]                 = useState('')
  const [endDate, setEndDate]                     = useState('')
  const [deskPage, setDeskPage]                   = useState(0)
  const [searchQuery, setSearchQuery]             = useState('')
  const [selectedPayment, setSelectedPayment]     = useState<any>(null)
  const [drawerOpen, setDrawerOpen]               = useState(false)
  // Мобильный свайп
  const swipeStartX = useRef(0)
  const [mobView, setMobView] = useState<'summary' | 'methods'>('summary')

  // Сброс страницы при смене фильтров
  useEffect(() => { setDeskPage(0) }, [statusFilter, methodFilter, searchQuery, startDate, endDate])

  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) router.push('/blocked')
      else if (!features.hasPayments) router.push('/dashboard')
    }
  }, [features.hasPayments, features.isActive, features.isLoading, router])

  useEffect(() => {
    const status = searchParams.get('status')
    const success = searchParams.get('success')
    const subscription = searchParams.get('subscription')
    if (status === 'success' || success === 'true' || subscription === 'success') toast.success(t('payments.paymentSuccess'))
    else if (status === 'failed') toast.error(t('payments.failedMessage'))
    else if (searchParams.get('canceled') === 'true') toast.error(t('payments.paymentCanceled'))
  }, [searchParams, t])

  const { data: payments = [], isLoading } = usePayments(undefined, {
    status: statusFilter, paymentMethod: methodFilter !== 'all' ? methodFilter : undefined,
    startDate, endDate, page: 0,
  })
  const { data: stats } = usePaymentsStats()

  // ✅ invalidateQueries вместо refetch() + router.refresh()
  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
  }
  const handleMethodSelect = (method: 'card' | 'cash' | 'bit') => {
    if (method === 'card') openModal('payment-unified', { defaultMethod: 'link', onSuccess: handlePaymentSuccess })
    else if (method === 'cash') openModal('payment-unified', { defaultMethod: 'cash', onSuccess: handlePaymentSuccess })
    else setBitDialogOpen(true)
  }

  // Фильтрация + поиск
  const filteredPayments = useMemo(() => {
    if (!payments || !searchQuery.trim()) return payments || []
    const q = searchQuery.toLowerCase()
    return payments.filter((p: any) => {
      const name = (p.client_name || (p.clients ? `${p.clients.first_name||''} ${p.clients.last_name||''}` : '') || '').toLowerCase()
      return name.includes(q) || (p.id || '').toLowerCase().includes(q)
    })
  }, [payments, searchQuery])

  // Пагинация для десктопа
  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE)
  const pageSales = useMemo(() =>
    filteredPayments.slice(deskPage * PAGE_SIZE, (deskPage + 1) * PAGE_SIZE),
  [filteredPayments, deskPage])

  // Группировка по датам (для мобиля и timeline)
  const groupedPayments = useMemo(() => {
    const map: Record<string, any[]> = {}
    filteredPayments.forEach((p: any) => {
      const k = (p.paid_at || p.created_at || '').slice(0, 10)
      if (!map[k]) map[k] = []
      map[k].push(p)
    })
    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(dateStr => {
      let label = dateStr
      try {
        const d = parseISO(dateStr)
        if (isToday(d)) label = locale === 'he' ? 'היום' : 'Сегодня'
        else if (isYesterday(d)) label = locale === 'he' ? 'אתמול' : 'Вчера'
        else label = format(d, locale === 'he' ? 'dd/MM/yyyy' : 'dd MMMM yyyy')
      } catch {}
      const dayTotal = map[dateStr].reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
      return { label, payments: map[dateStr], total: dayTotal }
    })
  }, [filteredPayments, locale])

  // Разбивка по методам — нормализуем сырые ключи БД, схлопываем дубли (card+credit, transfer+bank_transfer и т.д.)
  const methodBreakdown = useMemo(() => {
    if (!payments?.length) return []
    const total = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    // Аккумулируем по каноническому ключу
    const map: Record<string, number> = {}
    payments.forEach((p: any) => {
      const raw = p.payment_method || p.method || 'other'
      const canonical = normalizePaymentMethod(raw)
      map[canonical] = (map[canonical] || 0) + Number(p.amount || 0)
    })
    return Object.entries(map)
      .filter(([, amt]) => amt > 0)
      .map(([k, amt]) => ({
        ...getMethodCfg(k),
        key: k,
        amount: amt,
        pct: total > 0 ? Math.round((amt / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [payments])

  const hasDateFilter = !!(startDate || endDate)
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)

  return (
    <>
      <style>{`
        @keyframes fadeUp     { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes slideInRow { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:none } }
        @keyframes popIn      { from { opacity:0; transform:scale(.93) }       to { opacity:1; transform:none } }
        .anim-fadeup { animation: fadeUp 0.42s ease both }
        .anim-popin  { animation: popIn  0.32s ease both }
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important}}
      `}</style>

      <div dir={dir} className="min-h-screen space-y-4 pb-24 md:pb-8">

        {/* ── HEADER ── */}
        <div className="anim-fadeup flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('payments.title')}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{filteredPayments.length} {t('payments.title')}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 transition-colors">
              <FileText className="w-4 h-4" />{locale === 'he' ? 'סיכום' : 'Сводка'}
            </button>
            <button onClick={() => openModal('payment-unified', { onSuccess: handlePaymentSuccess })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-theme-primary text-white shadow-md hover:opacity-90 active:scale-95 transition-all">
              <Plus className="w-4 h-4" />{locale === 'he' ? 'עסקה חדשה' : 'Новая сделка'}
            </button>
          </div>
        </div>

        {/* ══════════════ МОБИЛЬ: Bento + свайп ══════════════ */}
        <div className="md:hidden">
          {/* Hero-карточка */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 18, padding: '16px 16px 12px', marginBottom: 8 }}
            onTouchStart={e => { swipeStartX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - swipeStartX.current
              if (dx < -50) setMobView('methods')
              else if (dx > 50) setMobView('summary')
            }}>
            <div style={{ fontSize: 9, color: 'rgba(199,210,254,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
              {locale === 'he' ? 'מחזור חודשי' : 'Оборот за месяц'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1, marginBottom: 8 }}>
              ₪{(stats?.totalAmount || 0).toFixed(0)}
            </div>
            {methodBreakdown.length > 0 && (
              <>
                <div style={{ display: 'flex', height: 4, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 5 }}>
                  {methodBreakdown.map((m, i) => (
                    <div key={i} style={{ flex: m.pct, background: m.color, borderRadius: 3, transition: 'flex .4s ease', minWidth: 3 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {methodBreakdown.slice(0, 5).map((m, i) => (
                    <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,.42)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                      {m.label[locale as 'ru' | 'he']}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Свайп-блок summary ↔ methods */}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', transition: 'transform .35s cubic-bezier(.32,.72,0,1)', transform: mobView === 'summary' ? 'translateX(0)' : 'translateX(-100%)' }}>
              {/* Summary */}
              <div style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { v: `₪${(stats?.totalAmount||0).toFixed(0)}`, lbl: locale === 'he' ? 'סה״כ' : 'Итого',   c: '#22c55e', bg: 'rgba(34,197,94,.1)',    b: 'rgba(34,197,94,.2)'    },
                  { v: String(stats?.count||0),                  lbl: locale === 'he' ? 'עסקאות' : 'Сделок', c: '#60a5fa', bg: 'rgba(96,165,250,.1)',   b: 'rgba(96,165,250,.2)'   },
                  { v: `₪${(stats?.avgAmount||0).toFixed(0)}`,  lbl: locale === 'he' ? 'ממוצע' : 'Среднее', c: '#a78bfa', bg: 'rgba(167,139,250,.1)',  b: 'rgba(167,139,250,.2)'  },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.b}`, borderRadius: 14, padding: '11px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: s.c, letterSpacing: '-0.5px' }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: s.c, opacity: .7, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
              {/* Methods — динамически */}
              <div style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: methodBreakdown.length >= 3 ? '1fr 1fr' : `repeat(${Math.max(methodBreakdown.length,1)},1fr)`, gap: 8 }}>
                {methodBreakdown.map((m, i) => (
                  <div key={i} style={{ background: m.bg, border: `1px solid ${m.color}25`, borderRadius: 14, padding: '11px 10px' }}>
                    <div style={{ fontSize: 14, marginBottom: 3 }}>{m.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: m.color }}>₪{m.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: m.color, opacity: .75, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{m.label[locale as 'ru' | 'he']} · {m.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dot-индикаторы */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
            {(['summary','methods'] as const).map(v => (
              <div key={v} onClick={() => setMobView(v)} style={{ width: mobView === v ? 16 : 6, height: 6, borderRadius: 3, background: mobView === v ? '#6366f1' : '#e2e8f0', cursor: 'pointer', transition: 'all .25s' }} />
            ))}
          </div>
        </div>

        {/* ══════════════ МОБИЛЬ: поиск + список по датам ══════════════ */}
        <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          style={{ animation: 'fadeUp 0.42s 0.18s ease both' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={locale === 'he' ? 'חיפוש...' : 'Поиск...'}
                className="w-full ps-8 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25" />
            </div>
            <button onClick={() => setFiltersOpen(true)}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${activeFilterCount > 0 ? 'bg-amber-50 border-amber-300 text-amber-600' : 'border-gray-100 text-gray-400'}`}>
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />}
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {isLoading ? [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-gray-100 rounded-full w-36" /><div className="h-3 bg-gray-100 rounded-full w-24" /></div>
                <div className="h-4 bg-gray-100 rounded-full w-14" />
              </div>
            )) : filteredPayments.length > 0
              ? filteredPayments.map((p: any, i: number) => (
                  <PaymentCard key={p.id} payment={p} locale={locale as 'ru' | 'he'}
                    onClick={() => { setSelectedPayment(p); setDrawerOpen(true) }} />
                ))
              : <EmptyState icon={<Receipt size={26} />}
                  title={locale === 'he' ? 'אין תשלומים' : 'Платежей нет'}
                  description={locale === 'he' ? 'צור תשלום חדש' : 'Создайте первый платёж'}
                  action={{ label: locale === 'he' ? 'הוסף' : 'Добавить', onClick: () => openModal('payment-unified', { onSuccess: handlePaymentSuccess }) }} />
            }
          </div>
        </div>

        {/* ══════════════ ДЕСКТОП: Split Layout ══════════════ */}
        <div className="hidden md:flex rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
          style={{ height: 'calc(100dvh - 220px)', minHeight: 480, animation: 'fadeUp 0.42s 0.1s ease both' }}>

          {/* ══ ЛЕВАЯ ТЁМНАЯ ПАНЕЛЬ ══ */}
          <div className="flex flex-col gap-5 p-5 overflow-y-auto flex-shrink-0"
            style={{ width: 'clamp(220px, 22vw, 300px)', background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)' }}>

            {/* Оборот */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(167,210,255,.45)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                {locale === 'he' ? 'מחזור חודשי' : 'Оборот за месяц'}
                {hasDateFilter && <span style={{ marginInlineStart: 6, color: 'rgba(251,191,36,.6)' }}>
                  {startDate && endDate ? `${startDate} → ${endDate}` : startDate ? `с ${startDate}` : `до ${endDate}`}
                </span>}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
                ₪{(stats?.totalAmount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(167,210,255,.4)', marginTop: 4 }}>
                {stats?.count || 0} {locale === 'he' ? 'עסקאות' : 'платежей'} · {locale === 'he' ? 'ממוצע' : 'средний'} ₪{Math.round(stats?.avgAmount || 0).toLocaleString()}
              </div>
            </div>

            {/* 3 мини-карточки */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { v: (stats?.totalAmount||0).toLocaleString(), prefix: '₪', color: '#34d399', lbl: locale === 'he' ? 'סה״כ' : 'Итого' },
                { v: String(stats?.count||0),                  prefix: '',  color: '#a5b4fc', lbl: locale === 'he' ? 'עסקאות' : 'Сделок' },
                { v: Math.round(stats?.avgAmount||0).toLocaleString(), prefix: '₪', color: '#fbbf24', lbl: locale === 'he' ? 'ממוצע' : 'Среднее' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '9px 10px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.prefix}{s.v}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Бар-чарт */}
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                {locale === 'he' ? 'לפי חודש' : 'По месяцам'}
              </div>
              <MiniBarChart payments={payments} locale={locale} />
            </div>

            {/* Методы оплаты — динамические, столько сколько есть */}
            {methodBreakdown.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  {locale === 'he' ? 'לפי שיטת תשלום' : 'По методам'}
                </div>
                {/* Полоса-пропорции */}
                <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                  {methodBreakdown.map((m, i) => (
                    <div key={i} style={{ flex: m.pct, background: m.color, borderRadius: 2, transition: 'flex .7s ease', minWidth: 3 }} />
                  ))}
                </div>
                {/* Список методов */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {methodBreakdown.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', flex: 1 }}>{m.label[locale as 'ru' | 'he']}</span>
                      <div style={{ width: 55, height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${m.pct}%`, background: m.color, borderRadius: 2, transition: 'width .7s ease' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', minWidth: 40, textAlign: 'right' }}>₪{m.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Синк-нота */}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', lineHeight: 1.4 }}>
                {locale === 'he' ? 'כל עסקה מסונכרנת עם מכירות' : 'Каждый платёж синхронизирован с продажами'}
              </span>
            </div>
          </div>{/* end левая панель */}

          {/* ══ ПРАВАЯ ПАНЕЛЬ ══ */}
          <div className="bg-white dark:bg-gray-800 flex flex-col min-w-0 flex-1 overflow-hidden">

            {/* Статичная зона: поиск + фильтры + шапка */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder={locale === 'he' ? 'חיפוש לפי שם...' : 'Поиск по имени...'}
                    className="w-full ps-8 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25" />
                </div>
                <button onClick={() => setFiltersOpen(true)}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${activeFilterCount > 0 ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400' : 'border-gray-100 dark:border-gray-600 text-gray-400 hover:border-gray-300'}`}>
                  <SlidersHorizontal size={15} />
                  {activeFilterCount > 0 && <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-gray-800" />}
                </button>
                {/* Фильтр метода */}
                <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                  className="text-xs border border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400/20">
                  <option value="all">{locale === 'he' ? 'כל השיטות' : 'Все методы'}</option>
                  {(['cash','card','bit','bank_transfer','check'] as const).map(k => {
                    const cfg = getMethodCfg(k)
                    return <option key={k} value={k}>{cfg.label[locale as 'ru' | 'he']}</option>
                  })}
                </select>
              </div>

              {/* Шапка таблицы */}
              {!isLoading && filteredPayments.length > 0 && (
                <div className="grid px-3 py-2 bg-gray-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700"
                  style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                  {[locale === 'he' ? 'לקוח' : 'Клиент', locale === 'he' ? 'תאריך' : 'Дата', locale === 'he' ? 'סכום' : 'Сумма', locale === 'he' ? 'סטטוס' : 'Статус'].map((h, i) => (
                    <span key={i} className={`text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ${i > 0 ? 'px-2' : ''} ${i === 2 ? 'text-right' : ''}`}>{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Скроллируемая зона: строки + пагинация */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full w-36" /><div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-24" /></div>
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && filteredPayments.length === 0 && (
                <div className="py-16 text-center">
                  <Receipt className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">{locale === 'he' ? 'אין תשלומים' : 'Платежей нет'}</p>
                  <button onClick={() => openModal('payment-unified', { onSuccess: handlePaymentSuccess })} className="mt-3 text-sm text-amber-500 hover:text-amber-600 hover:underline">
                    {locale === 'he' ? 'הוסף תשלום' : 'Добавить платёж'}
                  </button>
                </div>
              )}

              {!isLoading && filteredPayments.length > 0 && (
                <>
                  {pageSales.map((p: any, i: number) => (
                    <PaymentRow key={p.id} payment={p} locale={locale} index={i}
                      onClick={() => { setSelectedPayment(p); setDrawerOpen(true) }} />
                  ))}

                  {/* Пагинация */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                      <button onClick={() => setDeskPage(p => Math.max(0, p - 1))} disabled={deskPage === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft size={13} />{locale === 'he' ? 'הקודם' : 'Назад'}
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          const pg = totalPages <= 7 ? i : (deskPage < 4 ? i : deskPage - 3 + i)
                          if (pg >= totalPages) return null
                          return (
                            <button key={pg} onClick={() => setDeskPage(pg)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${pg === deskPage ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                              {pg + 1}
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={() => setDeskPage(p => Math.min(totalPages - 1, p + 1))} disabled={deskPage >= totalPages - 1}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                        {locale === 'he' ? 'הבא' : 'Вперёд'}<ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>{/* end split layout */}

        {/* FAB мобиль */}
        <button onClick={() => openModal('payment-unified', { onSuccess: handlePaymentSuccess })}
          className="md:hidden fixed bottom-6 end-6 w-14 h-14 rounded-full bg-theme-primary text-white shadow-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
          aria-label={locale === 'he' ? 'עסקה חדשה' : 'Новая сделка'}>
          <Plus className="w-6 h-6" />
        </button>

        {/* Filters Drawer */}
        <TrinityBottomDrawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title={locale === 'he' ? 'סינון' : 'Фильтры'}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('payments.filterByStatus')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payments.all')}</SelectItem>
                  <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                  <SelectItem value="completed">{t('payments.paid')}</SelectItem>
                  <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('payments.filterByMethod')}</label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payments.all')}</SelectItem>
                  <SelectItem value="cash">{t('payments.method.cash')}</SelectItem>
                  <SelectItem value="bit">{t('payments.method.bit')}</SelectItem>
                  <SelectItem value="credit_card">{t('payments.method.credit')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('payments.method.bankTransfer')}</SelectItem>
                  <SelectItem value="check">{locale === 'he' ? "צ'ק" : 'Чек/банковский'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('payments.fromDate')}</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('payments.toDate')}</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => { setStatusFilter('all'); setMethodFilter('all'); setStartDate(''); setEndDate('') }}
              className="flex-1 py-3 rounded-xl bg-muted font-medium text-sm">{locale === 'he' ? 'נקה' : 'Сбросить'}</button>
            <button onClick={() => setFiltersOpen(false)}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm">{locale === 'he' ? 'החל' : 'Применить'}</button>
          </div>
        </TrinityBottomDrawer>

        {/* BIT — отдельный провайдер, не входит в UnifiedPaymentDialog */}
        <CreateBitPaymentDialog open={bitDialogOpen} onOpenChange={setBitDialogOpen} onSuccess={handlePaymentSuccess} />
        <PaymentReportModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} locale={locale} />
        <PaymentDetailsDrawer
          payment={selectedPayment} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
          locale={locale} isOwner={!!isAdmin} isSuperAdmin={!!isAdmin}
          onRefunded={handlePaymentSuccess}
          onDeleted={() => { setDrawerOpen(false); setSelectedPayment(null); handlePaymentSuccess() }}
        />
      </div>
    </>
  )
}

// ─── PaymentsPage ─────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { isDemo } = useDemoMode()

  const PAYMENTS_STUB: DemoStubConfig = {
    emoji: '💳',
    titleRu: 'Платёжный модуль Trinity',
    titleHe: 'מודול תשלומים Trinity',
    descRu: 'Принимайте оплату от клиентов прямо в системе.\nБыстро, безопасно, без комиссии агрегаторов.',
    descHe: 'קבל תשלומים מלקוחות ישירות במערכת.\nמהיר, בטוח, ללא עמלות מיותרות.',
    featuresRu: ['Оплата картой онлайн', 'Bit / PayBox', 'Наличные с чеком', 'История платежей', 'Возвраты', 'Отчёты по периодам'],
    featuresHe: ['תשלום בכרטיס אשראי', 'ביט / PayBox', 'מזומן עם קבלה', 'היסטוריית תשלומים', 'החזרים', 'דוחות לפי תקופות'],
    accentColor: 'from-violet-500 to-purple-600',
  }

  if (isDemo) return <DemoStub config={PAYMENTS_STUB} />
  return <PaymentsContent />
}
