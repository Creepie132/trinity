'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Copy, ExternalLink, Eye, Banknote, CheckCircle, TrendingUp, SlidersHorizontal, Receipt, MessageCircle, MessageSquare } from 'lucide-react'
import { usePayments, usePaymentsStats } from '@/hooks/usePayments'
import { CreatePaymentLinkDialog } from '@/components/payments/CreatePaymentLinkDialog'
import { CreateSubscriptionDialog } from '@/components/payments/CreateSubscriptionDialog'
import { CreateCashPaymentDialog } from '@/components/payments/CreateCashPaymentDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExportButton } from '@/components/ExportButton'
import { PaymentCard } from '@/components/payments/PaymentCard'
import { PaymentDesktopPanel } from '@/components/payments/PaymentDesktopPanel'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { EmptyState } from '@/components/ui/EmptyState'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const { data: isAdmin } = useIsAdmin()
  const { t, language } = useLanguage()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)
  const [desktopPanelPayment, setDesktopPanelPayment] = useState<any>(null)

  // Parse payment info with priority logic
  function parsePaymentInfo(description: string | undefined, payment: any) {
    const locale = language === 'he' ? 'he' : 'ru'
    
    // Priority: separate fields from object
    if (payment.client_name || payment.clients) {
      const clientName = payment.client_name ||
        (payment.clients
          ? `${payment.clients.first_name || ''} ${payment.clients.last_name || ''}`.trim()
          : '—')
      return {
        clientName,
        subtitle: formatSubtitle(payment, null, locale)
      }
    }

    // Fallback: parse concatenated string "Наличные - Владислав Халфин"
    if (description && description.includes(' - ')) {
      const parts = description.split(' - ')
      const method = parts[0].trim()
      const name = parts.slice(1).join(' - ').trim() // handle dashes in name
      return {
        clientName: name || '—',
        subtitle: formatSubtitle(payment, method, locale)
      }
    }

    return {
      clientName: description || '—',
      subtitle: formatSubtitle(payment, null, locale)
    }
  }

  function formatSubtitle(payment: any, parsedMethod: string | null, locale: 'he' | 'ru') {
    const methodLabels: Record<string, { he: string, ru: string }> = {
      cash: { he: 'מזומן', ru: 'Наличные' },
      card: { he: 'כרטיס', ru: 'Карта' },
      credit_card: { he: 'כרטיס', ru: 'Карта' },
      transfer: { he: 'העברה', ru: 'Перевод' },
      bank_transfer: { he: 'העברה', ru: 'Перевод' },
      bit: { he: 'ביט', ru: 'Bit' },
    }

    const method = parsedMethod ||
      (payment.payment_method && methodLabels[payment.payment_method]?.[locale]) ||
      (payment.method && methodLabels[payment.method]?.[locale]) ||
      payment.payment_method ||
      payment.method ||
      ''

    const number = payment.id
      ? `#${payment.id.slice(0, 8)}`
      : (payment.payment_number ? `#${payment.payment_number}` : '')

    return [method, number].filter(Boolean).join(' — ')
  }

  const { data: payments, isLoading } = usePayments(undefined, {
    status: statusFilter,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
    startDate,
    endDate,
    page,
  })
  const { data: stats } = usePaymentsStats()

  // Check feature access and organization status
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasPayments) {
        router.push('/dashboard')
      }
    }
  }, [features.hasPayments, features.isActive, features.isLoading, router])

  // Show success/failure message from callback
  useEffect(() => {
    const status = searchParams.get('status')
    const success = searchParams.get('success')
    const subscription = searchParams.get('subscription')
    const canceled = searchParams.get('canceled')
    const paymentId = searchParams.get('payment_id')

    if (status === 'success' || success === 'true' || subscription === 'success') {
      toast.success(t('payments.paymentSuccess'))
    } else if (status === 'failed') {
      toast.error(t('payments.failedMessage'))
    } else if (canceled === 'true') {
      toast.error(t('payments.paymentCanceled'))
    }
  }, [searchParams, t])

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success(t('payments.linkCopied'))
  }

  const formatIsraeliPhone = (phone: string) => {
    if (!phone) return ''
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
      return cleaned.substring(1)
    }
    // If starts with 972, remove it
    if (cleaned.startsWith('972')) {
      return cleaned.substring(3)
    }
    return cleaned
  }

  const openWhatsApp = (phone: string, paymentLink: string) => {
    const formattedPhone = formatIsraeliPhone(phone)
    if (!formattedPhone) {
      toast.error(language === 'he' ? 'אין מספר טלפון' : 'Номер телефона отсутствует')
      return
    }
    const message = encodeURIComponent(paymentLink || '')
    window.open(`https://wa.me/972${formattedPhone}?text=${message}`, '_blank')
  }

  const openSMS = (phone: string) => {
    const formattedPhone = formatIsraeliPhone(phone)
    if (!formattedPhone) {
      toast.error(language === 'he' ? 'אין מספר טלפון' : 'Номер телефона отсутствует')
      return
    }
    window.open(`sms:${formattedPhone}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">{t('payments.paid')}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">{t('payments.pending')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('payments.failed')}</Badge>
      case 'refunded':
        return <Badge variant="secondary">{t('payments.refunded')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handlePaymentClick = (payment: any) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopPanelPayment(payment)
    }
    // Mobile - PaymentCard has own drawer logic
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header - Mobile centered, Desktop left-aligned */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title - centered on mobile, left on desktop */}
        <div className="text-center md:text-right">
          <h1 className="text-3xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('common.total')}: {payments?.length || 0} {t('payments.title')}
          </p>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex flex-wrap gap-3">
          <ExportButton type="payments" />
          {features.hasPayments && (
            <>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                {t('payments.createLink')}
              </Button>
            </>
          )}
          {features.hasSubscriptions && (
            <Button 
              onClick={() => setSubscriptionDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              {t('subscriptions.create')}
            </Button>
          )}
          {features.hasPayments && (
            <Button 
              onClick={() => setCashDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Banknote className="w-4 h-4 ml-2" />
              {t('payments.cashPayment')}
            </Button>
          )}
        </div>

        {/* Mobile: Single button with dropdown */}
        <div className="md:hidden">
          <Select onValueChange={(value) => {
            if (value === 'tranzilla') setDialogOpen(true)
            if (value === 'subscription') setSubscriptionDialogOpen(true)
            if (value === 'cash') setCashDialogOpen(true)
          }}>
            <SelectTrigger className="w-full bg-theme-primary dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:opacity-90 [&>span]:!text-gray-900 dark:[&>span]:!text-white [&_svg]:text-gray-900 dark:[&_svg]:text-white">
              <Plus className="w-4 h-4 ml-2 text-gray-900 dark:text-white" />
              <SelectValue placeholder={t('payments.selectPaymentMethod')} className="text-gray-900 dark:text-white" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700 dark:border-gray-600">
              {features.hasPayments && (
                <>
                  <SelectItem value="tranzilla" className="dark:text-white">{t('payments.createLink')}</SelectItem>
                  <SelectItem value="cash" className="dark:text-white">{t('payments.cashPayment')}</SelectItem>
                </>
              )}
              {features.hasSubscriptions && (
                <SelectItem value="subscription" className="dark:text-white">{t('subscriptions.create')}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="space-y-3 md:space-y-0">
          {/* Mobile: First 2 cards in a row */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <div 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
              style={{ animation: 'fadeInScale 0.4s ease-out 0s both' }}
            >
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₪{stats.totalAmount.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('payments.totalMonth')}</div>
            </div>

            <div 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
              style={{ animation: 'fadeInScale 0.4s ease-out 0.1s both' }}
            >
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.count}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('payments.successfulTransactions')}</div>
            </div>
          </div>

          {/* Mobile: Third card centered below */}
          <div className="flex justify-center md:hidden">
            <div 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md aspect-square flex flex-col items-center justify-between p-4 text-center"
              style={{ maxWidth: '50%', animation: 'fadeInScale 0.4s ease-out 0.2s both' }}
            >
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ₪{stats.avgAmount.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t('payments.avgTransaction')}</div>
            </div>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₪{stats.totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('payments.totalMonth')}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.count}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('payments.successfulTransactions')}</div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ₪{stats.avgAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('payments.avgTransaction')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Mobile: Button, Desktop: Fields */}
      <div className="md:hidden">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium w-full justify-center"
        >
          <SlidersHorizontal size={16} />
          {language === 'he' ? 'סינון' : 'Фильтры'}
          {((statusFilter !== 'all' ? 1 : 0) +
            (paymentMethodFilter !== 'all' ? 1 : 0) +
            (clientFilter !== 'all' ? 1 : 0) +
            (startDate ? 1 : 0) +
            (endDate ? 1 : 0)) > 0 && (
            <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {(statusFilter !== 'all' ? 1 : 0) +
                (paymentMethodFilter !== 'all' ? 1 : 0) +
                (clientFilter !== 'all' ? 1 : 0) +
                (startDate ? 1 : 0) +
                (endDate ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('payments.filterByStatus')}</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectItem value="all" className="text-gray-900 dark:text-white">{t('payments.all')}</SelectItem>
                <SelectItem value="pending" className="text-gray-900 dark:text-white">{t('payments.pending')}</SelectItem>
                <SelectItem value="completed" className="text-gray-900 dark:text-white">{t('payments.paid')}</SelectItem>
                <SelectItem value="failed" className="text-gray-900 dark:text-white">{t('payments.failed')}</SelectItem>
                <SelectItem value="refunded" className="text-gray-900 dark:text-white">{t('payments.refunded')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('payments.filterByMethod')}</label>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectItem value="all" className="text-gray-900 dark:text-white">{t('payments.all')}</SelectItem>
                <SelectItem value="cash" className="text-gray-900 dark:text-white">💵 {t('payments.method.cash')}</SelectItem>
                <SelectItem value="bit" className="text-gray-900 dark:text-white">📱 {t('payments.method.bit')}</SelectItem>
                <SelectItem value="credit_card" className="text-gray-900 dark:text-white">💳 {t('payments.method.credit')}</SelectItem>
                <SelectItem value="bank_transfer" className="text-gray-900 dark:text-white">🏦 {t('payments.method.bankTransfer')}</SelectItem>
                <SelectItem value="phone_credit" className="text-gray-900 dark:text-white">📞 {t('payments.method.phoneCredit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('payments.fromDate')}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('payments.toDate')}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('payments.filterByClient')}</label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <SelectItem value="all" className="text-gray-900 dark:text-white">{t('payments.all')}</SelectItem>
                {/* Client options will be populated dynamically */}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('payments.client')}</TableHead>
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('payments.description') || 'Описание'}</TableHead>
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('payments.amount')}</TableHead>
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('payments.status')}</TableHead>
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('common.date')}</TableHead>
                <TableHead className="text-start text-gray-700 dark:text-gray-300">{t('clients.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => {
                const { clientName, subtitle } = parsePaymentInfo(payment.description, payment)
                return (
                  <TableRow key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100 text-start">
                      <div className="min-w-0">
                        <p className="truncate">{clientName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400 text-start">
                      <div className="min-w-0">
                        <p className="truncate">{subtitle}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-lg text-gray-900 dark:text-gray-100 text-start">
                      ₪{Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300 text-start">
                      {payment.paid_at
                        ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm')
                        : format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.payment_link && payment.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyPaymentLink(payment.payment_link)}
                              title={t('payments.copyLink')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(payment.payment_link, '_blank')}
                              title={t('payments.openLink')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {payment.transaction_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={`${t('payments.transactionId')}: ${payment.transaction_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {(payment.clients?.phone || payment.client_phone) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openWhatsApp(payment.clients?.phone || payment.client_phone, payment.payment_link || '')}
                              title={language === 'he' ? 'שלח ב-WhatsApp' : 'Отправить в WhatsApp'}
                              className="hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openSMS(payment.clients?.phone || payment.client_phone)}
                              title={language === 'he' ? 'שלח SMS' : 'Отправить SMS'}
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t('payments.noPayments')}</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              {t('payments.createFirst')}
            </Button>
          </div>
        )}
        
        {/* Pagination */}
        {payments && payments.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              variant="outline"
              className="disabled:opacity-50"
            >
              ← {t('common.previous') || 'Назад'}
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.page') || 'Страница'} {page + 1}
            </span>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={payments.length < 20}
              variant="outline"
              className="disabled:opacity-50"
            >
              {t('common.next') || 'Вперёд'} →
            </Button>
          </div>
        )}
      </div>

      {/* Mobile - Payment Cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : payments && payments.length > 0 ? (
          payments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              locale={language === 'he' ? 'he' : 'ru'}
              onClick={handlePaymentClick}
            />
          ))
        ) : (
          <EmptyState
            icon={<Receipt size={28} />}
            title={language === 'he' ? 'אין תשלומים עדיין' : 'Платежей пока нет'}
            description={language === 'he' ? 'צור את התשלום הראשון' : 'Создайте первый платёж'}
            action={{
              label: language === 'he' ? 'הוסף תשלום' : 'Добавить',
              onClick: () => setDialogOpen(true),
            }}
          />
        )}
      </div>

      {/* Filters Drawer - Mobile */}
      <TrinityBottomDrawer
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={language === 'he' ? 'סינון' : 'Фильтры'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('payments.filterByStatus')}</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.all')}</SelectItem>
                <SelectItem value="cash">💵 {t('payments.method.cash')}</SelectItem>
                <SelectItem value="bit">📱 {t('payments.method.bit')}</SelectItem>
                <SelectItem value="credit_card">💳 {t('payments.method.credit')}</SelectItem>
                <SelectItem value="bank_transfer">🏦 {t('payments.method.bankTransfer')}</SelectItem>
                <SelectItem value="phone_credit">📞 {t('payments.method.phoneCredit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('payments.fromDate')}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('payments.toDate')}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => {
              setStatusFilter('all')
              setPaymentMethodFilter('all')
              setClientFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            className="flex-1 py-3 rounded-xl bg-muted font-medium"
          >
            {language === 'he' ? 'נקה' : 'Сбросить'}
          </button>
          <button
            onClick={() => setFiltersOpen(false)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            {language === 'he' ? 'החל' : 'Применить'}
          </button>
        </div>
      </TrinityBottomDrawer>

      {/* Dialogs */}
      <CreatePaymentLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CreateSubscriptionDialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen} />
      <CreateCashPaymentDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />

      {/* Desktop Panel */}
      <PaymentDesktopPanel
        payment={desktopPanelPayment}
        isOpen={!!desktopPanelPayment}
        onClose={() => setDesktopPanelPayment(null)}
        locale={language === 'he' ? 'he' : 'ru'}
        clients={payments?.map((p: any) => p.client || p.clients).filter(Boolean) || []}
        onClientClick={(clientId) => {
          // TODO: open ClientDesktopPanel
        }}
      />
    </div>
  )
}
