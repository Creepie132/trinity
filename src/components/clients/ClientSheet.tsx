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
import { ClientSummary } from '@/types/database'
import { Visit } from '@/types/visits'
import { Calendar, CreditCard, MessageSquare, Phone, Mail, MapPin, User, Clock, ArrowRight, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ClientSheetProps {
  client: ClientSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientSheet({ client, open, onOpenChange }: ClientSheetProps) {
  const { t, language } = useLanguage()
  const supabase = createSupabaseBrowserClient()
  const { data: fullClient } = useClient(client?.id)
  const { data: payments } = usePayments(client?.id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)

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
          <SheetTitle className="text-2xl text-gray-100 pr-12">
            {client.first_name} {client.last_name}
          </SheetTitle>
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
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPaymentDialogOpen(true)}
              className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
            >
              <CreditCard className="w-4 h-4 ml-2" />
              {t('clients.createPaymentLink')}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
            >
              <MessageSquare className="w-4 h-4 ml-2" />
              {t('clients.sendSMS')}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setVisitDialogOpen(true)}
              className="bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
            >
              <Calendar className="w-4 h-4 ml-2" />
              {t('clients.addVisit')}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-gray-700">
              <TabsTrigger value="visits" className="data-[state=active]:bg-gray-600">
                {t('clients.visitHistory')}
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-gray-600">
                {t('clients.payments')}
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
    </Sheet>
  )
}
