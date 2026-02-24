'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClient } from '@/hooks/useClients'
import { usePayments } from '@/hooks/usePayments'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { CreatePaymentDialog } from '@/components/payments/CreatePaymentDialog'
import { CreateVisitDialog } from '@/components/visits/CreateVisitDialog'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'
import { ClientSummary } from '@/types/database'
import { Visit } from '@/types/visits'
import { Calendar, CreditCard, MessageSquare, Phone, Mail, MapPin, User, Clock, ArrowRight, ArrowLeft, Trash2, Star, TrendingUp, Minus, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useDemoMode } from '@/hooks/useDemoMode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientSheetProps {
  client: ClientSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientSheet({ client, open, onOpenChange }: ClientSheetProps) {
  const { t, language } = useLanguage()
  const supabase = createSupabaseBrowserClient()
  const permissions = usePermissions()
  const { isAdmin, orgId } = useAuth()
  const { data: organization } = useOrganization()
  const { isDemo } = useDemoMode()
  const { data: fullClient } = useClient(client?.id)
  const { data: payments } = usePayments(client?.id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  
  // Check enabled modules
  const enabledModules = organization?.features?.modules || {}
  const paymentsEnabled = enabledModules.payments !== false && !isDemo
  const smsEnabled = enabledModules.sms !== false && !isDemo
  const visitsEnabled = enabledModules.visits !== false && !isDemo
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [gdprDeleteOpen, setGdprDeleteOpen] = useState(false)
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: ''
  })

  // Fetch client visits
  const { data: visits = [] } = useQuery({
    queryKey: ['client-visits', client?.id],
    enabled: !!client?.id,
    queryFn: async () => {
      if (!client?.id) return []
      
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false })

      if (error) throw error
      return (data || []) as Visit[]
    },
  })

  // Fetch loyalty points
  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery({
    queryKey: ['client-loyalty', client?.id, orgId],
    enabled: !!client?.id && !!orgId,
    queryFn: async () => {
      if (!client?.id || !orgId) return { balance: 0, history: [] }
      
      const response = await fetch(
        `/api/loyalty/points?client_id=${client.id}&org_id=${orgId}`
      )
      if (!response.ok) throw new Error('Failed to fetch loyalty points')
      return response.json()
    },
  })

  const handleRedeemPoints = async () => {
    if (!client?.id || !orgId) return
    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      toast.error('Введите корректное количество баллов')
      return
    }

    const points = -Math.abs(parseInt(redeemAmount))
    if (Math.abs(points) > (loyaltyData?.balance || 0)) {
      toast.error('Недостаточно баллов')
      return
    }

    try {
      const response = await fetch('/api/loyalty/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          client_id: client.id,
          points,
          type: 'redeem',
          description: `Списание ${Math.abs(points)} баллов`,
        }),
      })

      if (!response.ok) throw new Error('Failed to redeem points')

      toast.success('Баллы списаны!')
      setRedeemDialogOpen(false)
      setRedeemAmount('')
      refetchLoyalty()
    } catch (error) {
      console.error('Redeem error:', error)
      toast.error('Ошибка списания баллов')
    }
  }

  if (!client) return null

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: t('visits.scheduled'), variant: 'secondary' as const },
      in_progress: { label: t('visits.status.in_progress'), variant: 'default' as const },
      completed: { label: t('visits.completed'), variant: 'default' as const },
      cancelled: { label: t('visits.cancelled'), variant: 'destructive' as const },
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.scheduled
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      completed: { label: t('clients.paid'), variant: 'default' as const },
      pending: { label: t('clients.pending'), variant: 'secondary' as const },
      failed: { label: t('clients.failed'), variant: 'destructive' as const },
      refunded: { label: t('clients.refunded'), variant: 'outline' as const },
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-gray-800 text-gray-100">
        <SheetHeader className="relative">
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-11 w-11 rounded-full hover:bg-gray-700"
            aria-label={t('common.back')}
          >
            {language === 'he' ? (
              <ArrowRight className="h-6 w-6" />
            ) : (
              <ArrowLeft className="h-6 w-6" />
            )}
          </Button>
          <div className="flex items-center gap-2 pr-12">
            <SheetTitle className="text-2xl text-gray-100">
              {client.first_name} {client.last_name}
            </SheetTitle>
            <button
              onClick={() => setEditMode(true)}
              className="text-gray-400 hover:text-gray-200 transition"
              title={language === 'he' ? 'ערוך פרטים' : 'Редактировать'}
            >
              <Pencil size={16} />
            </button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <Phone className="w-4 h-4" />
              <span>{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-4 h-4" />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="w-4 h-4" />
                <span>{client.address}</span>
              </div>
            )}
            {client.date_of_birth && (
              <div className="flex items-center gap-3 text-gray-300">
                <User className="w-4 h-4" />
                <span>{t('clients.birthDate')}: {format(new Date(client.date_of_birth), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-950 p-4 rounded-lg border border-blue-800">
              <div className="text-2xl font-bold text-blue-400">{client.total_visits || 0}</div>
              <div className="text-sm text-gray-400">{t('clients.visits')}</div>
            </div>
            <div className="bg-green-950 p-4 rounded-lg border border-green-800">
              <div className="text-2xl font-bold text-green-400">
                ₪{Number(client.total_paid || 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">{t('clients.totalSpent')}</div>
            </div>
            <div className="bg-purple-950 p-4 rounded-lg border border-purple-800">
              <div className="text-sm text-gray-400">{t('clients.lastVisit')}</div>
              <div className="font-semibold text-gray-200">
                {client.last_visit ? format(new Date(client.last_visit), 'dd/MM/yyyy') : '-'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Payment Link - только если payments enabled */}
            {paymentsEnabled && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setPaymentDialogOpen(true)}
                className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
              >
                <CreditCard className="w-4 h-4 ml-2" />
                {t('clients.createPaymentLink')}
              </Button>
            )}
            
            {/* SMS - только если sms enabled */}
            {smsEnabled && (
              <Button 
                size="sm" 
                variant="outline"
                className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
              >
                <MessageSquare className="w-4 h-4 ml-2" />
                {t('clients.sendSMS')}
              </Button>
            )}
            
            {/* Add Visit - только если visits enabled */}
            {visitsEnabled && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setVisitDialogOpen(true)}
                className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
              >
                <Calendar className="w-4 h-4 ml-2" />
                {t('clients.addVisit')}
              </Button>
            )}
            
            {/* GDPR Delete - Owner only */}
            {isAdmin && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setGdprDeleteOpen(true)}
                className="gap-2 bg-red-600 hover:bg-red-700 border-red-500"
              >
                <Trash2 className="w-4 h-4" />
                🗑️ Полное удаление (GDPR)
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-gray-700">
              <TabsTrigger value="visits" className="data-[state=active]:bg-gray-600">
                {t('clients.visitHistory')}
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-gray-600">
                {t('clients.payments')}
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="data-[state=active]:bg-gray-600">
                <Star className="w-4 h-4 mr-1" />
                Баллы
              </TabsTrigger>
              <TabsTrigger value="sms" className="data-[state=active]:bg-gray-600">
                {t('clients.sms')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="mt-4">
              {visits && visits.length > 0 ? (
                <div className="space-y-3">
                  {visits.map((visit) => {
                    const statusBadge = getStatusBadge(visit.status || 'scheduled')
                    return (
                      <div
                        key={visit.id}
                        className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-lg text-gray-100">
                            {visit.service_type || '-'}
                          </div>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {visit.scheduled_at
                                ? format(new Date(visit.scheduled_at), 'dd/MM/yyyy HH:mm')
                                : '-'}
                            </span>
                          </div>
                          {visit.duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{visit.duration_minutes} {t('clients.minutes')}</span>
                            </div>
                          )}
                          {visit.price && (
                            <div className="font-semibold text-green-400">
                              ₪{Number(visit.price).toFixed(2)}
                            </div>
                          )}
                        </div>
                        {visit.notes && (
                          <div className="mt-2 text-sm text-gray-400 italic">
                            {visit.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {t('clients.noVisitHistory')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment: any) => {
                    const statusBadge = getPaymentStatusBadge(payment.status)
                    return (
                      <div
                        key={payment.id}
                        className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-lg text-gray-100">
                            ₪{Number(payment.amount).toFixed(2)}
                          </div>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-300">
                          {payment.paid_at
                            ? `${t('clients.dateLabel')}: ${format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm')}`
                            : `${t('clients.created')}: ${format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}`}
                        </div>
                        {payment.transaction_id && (
                          <div className="text-xs text-gray-500 mt-1">
                            {t('clients.transactionId')}: {payment.transaction_id}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {t('clients.noPayments')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="loyalty" className="mt-4">
              {/* Loyalty Balance */}
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-lg mb-4 border border-purple-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-400" />
                    <span className="text-lg font-semibold text-gray-100">Баланс баллов</span>
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {loyaltyData?.balance || 0}
                  </div>
                </div>
                <p className="text-sm text-gray-300">
                  Накопленные баллы можно использовать для оплаты
                </p>
                {(loyaltyData?.balance || 0) > 0 && (
                  <Button
                    onClick={() => setRedeemDialogOpen(true)}
                    variant="outline"
                    className="mt-4 w-full bg-purple-800 hover:bg-purple-700 border-purple-600"
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Списать баллы
                  </Button>
                )}
              </div>

              {/* Loyalty History */}
              {loyaltyData?.history && loyaltyData.history.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    История транзакций
                  </h3>
                  {loyaltyData.history.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-200">
                            {transaction.description || transaction.type}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            transaction.points > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {transaction.points > 0 ? '+' : ''}
                          {transaction.points}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  История транзакций пуста
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="mt-4">
              <div className="text-center text-gray-500 py-8">
                {t('clients.noSMS')}
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          {client.notes && (
            <div className="bg-yellow-950 p-4 rounded-lg border border-yellow-800">
              <div className="font-semibold text-gray-200 mb-2">{t('clients.notes')}:</div>
              <div className="text-gray-300 whitespace-pre-wrap">{client.notes}</div>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Payment Dialog */}
      <CreatePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        clientId={client.id}
        clientName={`${client.first_name} ${client.last_name}`}
      />

      {/* Create Visit Dialog */}
      <CreateVisitDialog
        open={visitDialogOpen}
        onOpenChange={setVisitDialogOpen}
        preselectedClientId={client.id}
      />

      {/* GDPR Delete Dialog */}
      <GdprDeleteDialog
        open={gdprDeleteOpen}
        onOpenChange={setGdprDeleteOpen}
        clientId={client.id}
        clientName={`${client.first_name} ${client.last_name}`}
      />

      {/* Redeem Points Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="bg-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Списать баллы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="redeem-amount">Количество баллов</Label>
              <Input
                id="redeem-amount"
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="0"
                className="bg-gray-700 border-gray-600 mt-2"
                max={loyaltyData?.balance || 0}
              />
              <p className="text-sm text-gray-400 mt-2">
                Доступно: {loyaltyData?.balance || 0} баллов
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRedeemDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleRedeemPoints}>Списать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
