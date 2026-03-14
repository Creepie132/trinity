'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const { data: isAdmin } = useIsAdmin()
  const { t, language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'

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

  const { data: payments, isLoading, refetch } = usePayments(undefined, {
    status: statusFilter,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
    startDate,
    endDate,
    page,
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
    if (status === 'success' || success === 'true' || subscription === 'success') {
      toast.success(t('payments.paymentSuccess'))
    } else if (status === 'failed') {
      toast.error(t('payments.failedMessage'))
    } else if (searchParams.get('canceled') === 'true') {
      toast.error(t('payments.paymentCanceled'))
    }
  }, [searchParams, t])

  const handlePaymentSuccess = () => { refetch(); router.refresh() }

  const handleMethodSelect = (method: 'card' | 'cash' | 'bit') => {
    switch (method) {
      case 'card': setCardDialogOpen(true); break
      case 'cash': setCashDialogOpen(true); break
      case 'bit': setBitDialogOpen(true); break
    }
  }

  const openPaymentDrawer = (payment: any) => {
    setSelectedPayment(payment)
    setDrawerOpen(true)
  }

  // Client-side search filter
  const filteredPayments = useMemo(() => {
    if (!payments || !searchQuery.trim()) return payments || []
    const q = searchQuery.toLowerCase()
    return payments.filter((p: any) => {
      const name = (
        p.client_name ||
        (p.clients ? `${p.clients.first_name || ''} ${p.clients.last_name || ''}` : '') ||
        ''
      ).toLowerCase()
      const id = (p.id || '').toLowerCase()
      const desc = (p.description || '').toLowerCase()
      return name.includes(q) || id.includes(q) || desc.includes(q)
    })
  }, [payments, searchQuery])

  // Group payments by date
  const groupedPayments = useMemo(() => {
    const groups: { label: string; payments: any[] }[] = []
    const map: Record<string, any[]> = {}

    filteredPayments.forEach((p: any) => {
      const dateStr = (p.paid_at || p.created_at || '').slice(0, 10)
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(p)
    })

    Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .forEach(dateStr => {
        let label = dateStr
        try {
          const d = parseISO(dateStr)
          if (isToday(d)) label = locale === 'he' ? 'היום' : 'Сегодня'
          else if (isYesterday(d)) label = locale === 'he' ? 'אתמול' : 'Вчера'
          else label = format(d, locale === 'he' ? 'dd/MM/yyyy' : 'dd MMMM yyyy')
        } catch {}
        groups.push({ label, payments: map[dateStr] })
      })

    return groups
  }, [filteredPayments, locale])

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (paymentMethodFilter !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0)

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

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Banknote className="w-4 h-4" />, value: `₪${stats.totalAmount.toFixed(0)}`, label: t('payments.totalMonth'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { icon: <CheckCircle className="w-4 h-4" />, value: String(stats.count), label: t('payments.successfulTransactions'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { icon: <TrendingUp className="w-4 h-4" />, value: `₪${stats.avgAmount.toFixed(0)}`, label: t('payments.avgTransaction'), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center" style={{ animation: `ppFadeIn .3s ease-out ${i * 0.07}s both` }}>
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
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={locale === 'he' ? 'חיפוש לפי שם...' : 'Поиск по имени...'}
            className="pl-9 h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {locale === 'he' ? 'סינון' : 'Фильтры'}
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Recurring payments notice */}
      {!features.recurringEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="text-gray-400">🔒</span>
          <p className="text-xs text-gray-500">
            {locale === 'he' ? 'תשלומים חוזרים אינם זמינים בתוכנית שלך' : 'Рекуррентные платежи недоступны в вашем тарифе'}
          </p>
        </div>
      )}

      {/* Payments list — grouped by date */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">{t('common.loading')}</div>
      ) : groupedPayments.length > 0 ? (
        <div className="space-y-4">
          {groupedPayments.map(group => (
            <div key={group.label}>
              {/* Date label */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{group.label}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">
                  ₪{group.payments.reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(0)}
                </span>
              </div>
              {/* Cards */}
              {group.payments.map((payment: any) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  locale={locale}
                  onClick={openPaymentDrawer}
                />
              ))}
            </div>
          ))}
          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline" size="sm">
              ← {t('common.previous') || 'Назад'}
            </Button>
            <span className="text-xs text-gray-400">{t('common.page') || 'Стр.'} {page + 1}</span>
            <Button onClick={() => setPage(p => p + 1)} disabled={(payments?.length || 0) < 20} variant="outline" size="sm">
              {t('common.next') || 'Вперёд'} →
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={28} />}
          title={locale === 'he' ? 'אין תשלומים עדיין' : 'Платежей пока нет'}
          description={locale === 'he' ? 'צור את התשלום הראשון' : 'Создайте первый платёж'}
          action={{ label: locale === 'he' ? 'הוסף' : 'Добавить', onClick: () => setMethodModalOpen(true) }}
        />
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
          <button onClick={() => { setStatusFilter('all'); setPaymentMethodFilter('all'); setStartDate(''); setEndDate('') }} className="flex-1 py-3 rounded-xl bg-muted font-medium text-sm">
            {locale === 'he' ? 'נקה' : 'Сбросить'}
          </button>
          <button onClick={() => setFiltersOpen(false)} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
            {locale === 'he' ? 'החל' : 'Применить'}
          </button>
        </div>
      </TrinityBottomDrawer>

      {/* Modals & Dialogs */}
      <PaymentMethodModal open={methodModalOpen} onOpenChange={setMethodModalOpen} onSelectMethod={handleMethodSelect} />
      <CreatePaymentLinkDialog open={cardDialogOpen} onOpenChange={setCardDialogOpen} onSuccess={handlePaymentSuccess} />
      <CreateCashPaymentDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} onSuccess={handlePaymentSuccess} />
      <CreateBitPaymentDialog open={bitDialogOpen} onOpenChange={setBitDialogOpen} onSuccess={handlePaymentSuccess} />
      <PaymentReportModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} locale={locale} />

      {/* Payment details drawer */}
      <PaymentDetailsDrawer
        payment={selectedPayment}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale}
        isOwner={!!isAdmin}
        onRefunded={handlePaymentSuccess}
      />

      <style>{`
        @keyframes ppFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
