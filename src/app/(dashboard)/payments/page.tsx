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
import { Plus, Copy, ExternalLink, Eye, Banknote } from 'lucide-react'
import { usePayments, usePaymentsStats } from '@/hooks/usePayments'
import { CreatePaymentLinkDialog } from '@/components/payments/CreatePaymentLinkDialog'
import { CreateStripePaymentDialog } from '@/components/payments/CreateStripePaymentDialog'
import { CreateSubscriptionDialog } from '@/components/payments/CreateSubscriptionDialog'
import { CreateCashPaymentDialog } from '@/components/payments/CreateCashPaymentDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
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
  const { t } = useLanguage()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: payments, isLoading } = usePayments(undefined, {
    status: statusFilter,
    paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
    startDate,
    endDate,
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
          {features.hasPayments && (
            <>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                {t('payments.createLink')}
              </Button>
              {isAdmin && (
                <Button 
                  onClick={() => setStripeDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  Stripe
                </Button>
              )}
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
            if (value === 'stripe') setStripeDialogOpen(true)
            if (value === 'subscription') setSubscriptionDialogOpen(true)
            if (value === 'cash') setCashDialogOpen(true)
          }}>
            <SelectTrigger className="w-full bg-theme-primary text-white hover:opacity-90">
              <Plus className="w-4 h-4 ml-2" />
              <SelectValue placeholder={t('payments.selectPaymentMethod')} />
            </SelectTrigger>
            <SelectContent>
              {features.hasPayments && (
                <>
                  <SelectItem value="tranzilla">{t('payments.createLink')}</SelectItem>
                  {isAdmin && <SelectItem value="stripe">Stripe</SelectItem>}
                  <SelectItem value="cash">{t('payments.cashPayment')}</SelectItem>
                </>
              )}
              {features.hasSubscriptions && (
                <SelectItem value="subscription">{t('subscriptions.create')}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-sm text-gray-600 mt-1">{t('payments.avgTransaction')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
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
                <SelectItem value="stripe" className="text-gray-900 dark:text-white">🟣 Stripe</SelectItem>
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        ) : payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">{t('payments.client')}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{t('payments.amount')}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{t('payments.status')}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{t('payments.method')}</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">{t('common.date')}</TableHead>
                <TableHead className="text-left text-gray-700 dark:text-gray-300">{t('clients.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => (
                <TableRow key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {payment.clients
                      ? `${payment.clients.first_name} ${payment.clients.last_name}`
                      : t('payments.unknown')}
                  </TableCell>
                  <TableCell className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    ₪{Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    {payment.payment_method === 'credit_card'
                      ? t('payments.card')
                      : payment.payment_method || '-'}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
      </div>

      {/* Dialogs */}
      <CreatePaymentLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CreateStripePaymentDialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen} />
      <CreateSubscriptionDialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen} />
      <CreateCashPaymentDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  )
}
