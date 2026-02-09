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
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const features = useFeatures()
  const [dialogOpen, setDialogOpen] = useState(false)
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
        router.push('/')
      }
    }
  }, [features.hasPayments, features.isActive, features.isLoading, router])

  // Show success/failure message from callback
  useEffect(() => {
    const status = searchParams.get('status')
    const paymentId = searchParams.get('payment_id')

    if (status === 'success') {
      toast.success('התשלום בוצע בהצלחה!')
    } else if (status === 'failed') {
      toast.error('התשלום נכשל')
    }
  }, [searchParams])

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('הקישור הועתק ללוח')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">שולם</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">ממתין</Badge>
      case 'failed':
        return <Badge variant="destructive">נכשל</Badge>
      case 'refunded':
        return <Badge variant="secondary">הוחזר</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תשלומים</h1>
          <p className="text-gray-600 mt-1">
            סה״כ: {payments?.length || 0} תשלומים
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          צור קישור לתשלום
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              ₪{stats.totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">סך התשלומים החודש</div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
            <div className="text-sm text-gray-600 mt-1">עסקאות מוצלחות</div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              ₪{stats.avgAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">ממוצע לעסקה</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">סטטוס</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="completed">שולם</SelectItem>
                <SelectItem value="failed">נכשל</SelectItem>
                <SelectItem value="refunded">הוחזר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">מתאריך</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">עד תאריך</label>
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
          <div className="text-center py-12 text-gray-500">טוען...</div>
        ) : payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>לקוח</TableHead>
                <TableHead>סכום</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>אמצעי תשלום</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.clients
                      ? `${payment.clients.first_name} ${payment.clients.last_name}`
                      : 'לא ידוע'}
                  </TableCell>
                  <TableCell className="font-semibold text-lg">
                    ₪{Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    {payment.payment_method === 'credit_card'
                      ? 'כרטיס אשראי'
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
                            title="העתק קישור"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(payment.payment_link, '_blank')}
                            title="פתח קישור"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {payment.transaction_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title={`מזהה עסקה: ${payment.transaction_id}`}
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
            <p className="text-gray-500 mb-4">אין תשלומים</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              צור קישור לתשלום ראשון
            </Button>
          </div>
        )}
      </div>

      {/* Dialog */}
      <CreatePaymentLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
