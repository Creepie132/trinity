'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, SlidersHorizontal, Receipt, FileText, Search, TrendingUp, Banknote, CheckCircle } from 'lucide-react'
import { usePayments, usePaymentsStats } from '@/hooks/usePayments'
import { CreatePaymentLinkDialog } from '@/components/payments/CreatePaymentLinkDialog'
import { PaymentReportModal } from '@/components/payments/PaymentReportModal'
import { CreateCashPaymentDialog } from '@/components/payments/CreateCashPaymentDialog'
import { CreateBitPaymentDialog } from '@/components/payments/CreateBitPaymentDialog'
import { PaymentMethodModal } from '@/components/payments/PaymentMethodModal'
import { PaymentCard } from '@/components/payments/PaymentCard'
import { PaymentDetailsDrawer } from '@/components/payments/PaymentDetailsDrawer'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawerLazy'
import { EmptyState } from '@/components/ui/EmptyState'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoStub, DemoStubConfig } from '@/components/demo/DemoStub'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const { data: isAdmin } = useIsAdmin()
  const { t, language } = useLanguage()
  const { isDemo } = useDemoMode()
  const locale = language === 'he' ? 'he' : 'ru'

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

  const [methodModalOpen, setMethodModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [bitDialogOpen, setBitDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Swipeable stats: 'summary' = 3 блока | 'methods' = плашки методов
  const [statsView, setStatsView] = useState<'summary' | 'methods'>('summary')
  const swipeStartX = useRef(0)

  const { data: payments, isLoading, refetch } = usePayments(undefined, {
    status: statusFilter,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
    startDate, endDate, page,
  })
  const { data: stats } = usePaymentsStats()

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

  const handlePaymentSuccess = () => { refetch(); router.refresh() }

  const handleMethodSelect = (method: 'card' | 'cash' | 'bit') => {
    if (method === 'card') setCardDialogOpen(true)
    else if (method === 'cash') setCashDialogOpen(true)
    else setBitDialogOpen(true)
  }

  const filteredPayments = useMemo(() => {
    if (!payments || !searchQuery.trim()) return payments || []
    const q = searchQuery.toLowerCase()
    return payments.filter((p: any) => {
      const name = (p.client_name || (p.clients ? `${p.clients.first_name||''} ${p.clients.last_name||''}` : '') || '').toLowerCase()
      return name.includes(q) || (p.id||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)
    })
  }, [payments, searchQuery])

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
      return { label, payments: map[dateStr] }
    })
  }, [filteredPayments, locale])

  // Breakdown по методам оплаты из текущего списка
  const methodBreakdown = useMemo(() => {
    if (!payments) return []
    const total = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    const cfg: Record<string, { color: string; icon: string; label: string }> = {
      cash:          { color: '#22c55e', icon: '💵', label: locale === 'he' ? 'מזומן' : 'Наличные' },
      bit:           { color: '#f97316', icon: '📱', label: 'BIT' },
      credit_card:   { color: '#6366f1', icon: '💳', label: locale === 'he' ? 'כרטיס' : 'Карта' },
      card:          { color: '#6366f1', icon: '💳', label: locale === 'he' ? 'כרטיס' : 'Карта' },
      bank_transfer: { color: '#0ea5e9', icon: '🏦', label: locale === 'he' ? 'העברה' : 'Перевод' },
      transfer:      { color: '#0ea5e9', icon: '🏦', label: locale === 'he' ? 'העברה' : 'Перевод' },
    }
    const map: Record<string, number> = {}
    payments.forEach((p: any) => {
      const k = p.payment_method || 'cash'
      map[k] = (map[k] || 0) + Number(p.amount || 0)
    })
    return Object.entries(map)
      .filter(([, amt]) => amt > 0)
      .map(([k, amt]) => ({ ...( cfg[k] || { color: '#94a3b8', icon: '💰', label: k }), amount: amt, pct: total > 0 ? Math.round((amt / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [payments, locale])

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (paymentMethodFilter !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0)

  if (isDemo) return <DemoStub config={PAYMENTS_STUB} />

  return (
    <div className="space-y-5 min-h-screen" style={{ animation: 'ppFadeIn .3s ease-out both' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-center md:text-start">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('payments.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredPayments.length} {t('payments.title')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setReportModalOpen(true)} variant="outline" size="sm" className="border-amber-400 text-amber-600 hover:bg-amber-50">
            <FileText className="w-4 h-4 mr-1" />
            {locale === 'he' ? 'סיכום' : 'Сводка'}
          </Button>
          <Button onClick={() => setMethodModalOpen(true)} size="sm" className="bg-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" />
            {locale === 'he' ? 'עסקה חדשה' : 'Новая сделка'}
          </Button>
        </div>
      </div>

      {/* ── МОБИЛЬНЫЙ БЕНТО-ХИРО с свайпом ── */}
      {stats && (
        <div
          className="md:hidden"
          onTouchStart={e => { swipeStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - swipeStartX.current
            if (dx < -50) setStatsView('methods')
            else if (dx > 50) setStatsView('summary')
          }}
        >
          {/* Hero card — Bento style */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 18, padding: '18px 18px 14px', marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'rgba(199,210,254,.5)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
              {locale === 'he' ? 'מחזור חודשי' : 'Оборот за месяц'}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 10 }}>
              ₪{stats.totalAmount.toFixed(0)}
            </div>
            {/* Полосы методов — концепт 3 */}
            {methodBreakdown.length > 0 && (
              <>
                <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 6 }}>
                  {methodBreakdown.map((m, i) => (
                    <div key={i} style={{ flex: m.pct, background: m.color, borderRadius: 3, transition: 'flex .4s ease' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {methodBreakdown.map((m, i) => (
                    <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                      {m.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Свайп-блок: Summary ↔ Methods */}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', transition: 'transform .35s cubic-bezier(.32,.72,0,1)', transform: statsView === 'summary' ? 'translateX(0)' : 'translateX(-100%)' }}>
              {/* SUMMARY: 3 карточки */}
              <div style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { icon: '₪', value: `₪${stats.totalAmount.toFixed(0)}`, label: locale === 'he' ? 'סה״כ' : 'Итого', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)' },
                  { icon: '✓', value: String(stats.count), label: locale === 'he' ? 'עסקאות' : 'Сделок', color: '#60a5fa', bg: 'rgba(96,165,250,.1)', border: 'rgba(96,165,250,.25)' },
                  { icon: '~', value: `₪${stats.avgAmount.toFixed(0)}`, label: locale === 'he' ? 'ממוצע' : 'Среднее', color: '#a78bfa', bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.25)' },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '12px 10px', textAlign: 'center', animation: `ppFadeIn .3s ease-out ${i * .07}s both` }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: s.color, opacity: .7, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* METHODS: плашки методов */}
              <div style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: methodBreakdown.length >= 3 ? '1fr 1fr' : `repeat(${Math.max(methodBreakdown.length, 1)}, 1fr)`, gap: 8 }}>
                {methodBreakdown.map((m, i) => (
                  <div key={i} style={{ background: `${m.color}12`, border: `1px solid ${m.color}30`, borderRadius: 14, padding: '11px 10px', animation: `ppFadeIn .3s ease-out ${i * .07}s both` }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>₪{m.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: m.color, opacity: .75, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{m.label} · {m.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
            {['summary', 'methods'].map(v => (
              <div key={v} onClick={() => setStatsView(v as any)} style={{ width: statsView === v ? 16 : 6, height: 6, borderRadius: 3, background: statsView === v ? '#6366f1' : '#e2e8f0', cursor: 'pointer', transition: 'all .25s' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── ДЕСКТОП статистика (без изменений) ── */}
      {stats && (
        <div className="hidden md:grid grid-cols-3 gap-3">
          {[
            { icon: <Banknote className="w-4 h-4" />, value: `₪${stats.totalAmount.toFixed(0)}`, label: t('payments.totalMonth'), color: 'text-green-600', bg: 'bg-green-50' },
            { icon: <CheckCircle className="w-4 h-4" />, value: String(stats.count), label: t('payments.successfulTransactions'), color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: <TrendingUp className="w-4 h-4" />, value: `₪${stats.avgAmount.toFixed(0)}`, label: t('payments.avgTransaction'), color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5 ${s.bg} ${s.color}`}>{s.icon}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={locale === 'he' ? 'חיפוש לפי שם...' : 'Поиск по имени...'}
            className="pl-9 h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" />
        </div>
        <button onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <SlidersHorizontal size={15} />
          {locale === 'he' ? 'סינון' : 'Фильтры'}
          {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {!features.recurringEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="text-gray-400">🔒</span>
          <p className="text-xs text-gray-500">{locale === 'he' ? 'תשלומים חוזרים אינם זמינים בתוכנית שלך' : 'Рекуррентные платежи недоступны в вашем тарифе'}</p>
        </div>
      )}

      {/* Payments list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">{t('common.loading')}</div>
      ) : groupedPayments.length > 0 ? (
        <div className="space-y-4">
          {groupedPayments.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{group.label}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">₪{group.payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(0)}</span>
              </div>
              {group.payments.map((payment: any) => (
                <PaymentCard key={payment.id} payment={payment} locale={locale} onClick={p => { setSelectedPayment(p); setDrawerOpen(true) }} />
              ))}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm">← {t('common.previous') || 'Назад'}</Button>
            <span className="text-xs text-gray-400">{t('common.page') || 'Стр.'} {page + 1}</span>
            <Button onClick={() => setPage(p => p + 1)} disabled={(payments?.length || 0) < 20} variant="outline" size="sm">{t('common.next') || 'Вперёд'} →</Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Receipt size={28} />}
          title={locale === 'he' ? 'אין תשלומים עדיין' : 'Платежей пока нет'}
          description={locale === 'he' ? 'צור את התשלום הראשון' : 'Создайте первый платёж'}
          action={{ label: locale === 'he' ? 'הוסף' : 'Добавить', onClick: () => setMethodModalOpen(true) }} />
      )}

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
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.all')}</SelectItem>
                <SelectItem value="cash">{t('payments.method.cash')}</SelectItem>
                <SelectItem value="bit">{t('payments.method.bit')}</SelectItem>
                <SelectItem value="credit_card">{t('payments.method.credit')}</SelectItem>
                <SelectItem value="bank_transfer">{t('payments.method.bankTransfer')}</SelectItem>
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
          <button onClick={() => { setStatusFilter('all'); setPaymentMethodFilter('all'); setStartDate(''); setEndDate('') }} className="flex-1 py-3 rounded-xl bg-muted font-medium text-sm">{locale === 'he' ? 'נקה' : 'Сбросить'}</button>
          <button onClick={() => setFiltersOpen(false)} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm">{locale === 'he' ? 'החל' : 'Применить'}</button>
        </div>
      </TrinityBottomDrawer>

      <PaymentMethodModal open={methodModalOpen} onOpenChange={setMethodModalOpen} onSelectMethod={handleMethodSelect} />
      <CreatePaymentLinkDialog open={cardDialogOpen} onOpenChange={setCardDialogOpen} onSuccess={handlePaymentSuccess} />
      <CreateCashPaymentDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} onSuccess={handlePaymentSuccess} />
      <CreateBitPaymentDialog open={bitDialogOpen} onOpenChange={setBitDialogOpen} onSuccess={handlePaymentSuccess} />
      <PaymentReportModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} locale={locale} />
      <PaymentDetailsDrawer
        payment={selectedPayment} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
        locale={locale} isOwner={!!isAdmin} isSuperAdmin={!!isAdmin}
        onRefunded={handlePaymentSuccess}
        onDeleted={() => { setDrawerOpen(false); setSelectedPayment(null); handlePaymentSuccess() }}
      />

      <style>{`
        @keyframes ppFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
