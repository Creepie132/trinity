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
import { Plus, Copy, ExternalLink, Eye } from 'lucide-react'
import { usePayments, usePaymentsStats } from '@/hooks/usePayments'
import { CreatePaymentLinkDialog } from '@/components/payments/CreatePaymentLinkDialog'
import { CreateStripePaymentDialog } from '@/components/payments/CreateStripePaymentDialog'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: payments, isLoading } = usePayments(undefined, {
    status: statusFilter,
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
    const paymentId = searchParams.get('payment_id')

    if (status === 'success') {
      toast.success(t('payments.successMessage'))
    } else if (status === 'failed') {
      toast.error(t('payments.failedMessage'))
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('common.total')}: {payments?.length || 0} {t('payments.title')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            {t('payments.createLink')} (Tranzilla)
          </Button>
          <Button 
            onClick={() => setStripeDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            {t('payments.createLink')} (Stripe)
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              ₪{stats.totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('payments.totalMonth')}</div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
            <div className="text-sm text-gray-600 mt-1">{t('payments.successfulTransactions')}</div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              ₪{stats.avgAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">{t('payments.avgTransaction')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('payments.status')}</label>
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('payments.client')}</TableHead>
                <TableHead>{t('payments.amount')}</TableHead>
                <TableHead>{t('payments.status')}</TableHead>
                <TableHead>{t('payments.method')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-left">{t('clients.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.clients
                      ? `${payment.clients.first_name} ${payment.clients.last_name}`
                      : t('payments.unknown')}
                  </TableCell>
                  <TableCell className="font-semibold text-lg">
                    ₪{Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    {payment.payment_method === 'credit_card'
                      ? t('payments.card')
                      : payment.payment_method || '-'}
                  </TableCell>
                  <TableCell>
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
    </div>
  )
}
