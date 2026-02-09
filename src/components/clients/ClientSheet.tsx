'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClient } from '@/hooks/useClients'
import { usePayments } from '@/hooks/usePayments'
import { CreatePaymentDialog } from '@/components/payments/CreatePaymentDialog'
import { ClientSummary } from '@/types/database'
import { Calendar, CreditCard, MessageSquare, Phone, Mail, MapPin, User } from 'lucide-react'
import { format } from 'date-fns'

interface ClientSheetProps {
  client: ClientSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientSheet({ client, open, onOpenChange }: ClientSheetProps) {
  const { data: fullClient } = useClient(client?.id)
  const { data: payments } = usePayments(client?.id)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  if (!client) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {client.first_name} {client.last_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="w-4 h-4" />
              <span>{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4" />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-4 h-4" />
                <span>{client.address}</span>
              </div>
            )}
            {client.date_of_birth && (
              <div className="flex items-center gap-3 text-gray-700">
                <User className="w-4 h-4" />
                <span>תאריך לידה: {format(new Date(client.date_of_birth), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{client.total_visits}</div>
              <div className="text-sm text-gray-600">ביקורים</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">₪{client.total_paid}</div>
              <div className="text-sm text-gray-600">סך תשלומים</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">ביקור אחרון</div>
              <div className="font-semibold text-gray-800">
                {client.last_visit ? format(new Date(client.last_visit), 'dd/MM/yyyy') : 'אין'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="w-4 h-4 ml-2" />
              צור קישור תשלום
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="w-4 h-4 ml-2" />
              שלח SMS
            </Button>
            <Button size="sm" variant="outline">
              <Calendar className="w-4 h-4 ml-2" />
              הוסף ביקור
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="visits">היסטוריית ביקורים</TabsTrigger>
              <TabsTrigger value="payments">תשלומים</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="mt-4">
              <div className="text-center text-gray-500 py-8">
                אין היסטוריית ביקורים
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg text-gray-900">
                          ₪{Number(payment.amount).toFixed(2)}
                        </div>
                        <Badge
                          variant={
                            payment.status === 'completed'
                              ? 'default'
                              : payment.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {payment.status === 'completed'
                            ? 'שולם'
                            : payment.status === 'pending'
                            ? 'ממתין'
                            : payment.status === 'failed'
                            ? 'נכשל'
                            : 'הוחזר'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {payment.paid_at
                          ? `תאריך: ${format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm')}`
                          : `נוצר: ${format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}`}
                      </div>
                      {payment.transaction_id && (
                        <div className="text-xs text-gray-500 mt-1">
                          מזהה עסקה: {payment.transaction_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  אין תשלומים
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="mt-4">
              <div className="text-center text-gray-500 py-8">
                אין הודעות SMS
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          {client.notes && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="font-semibold text-gray-700 mb-2">הערות:</div>
              <div className="text-gray-600 whitespace-pre-wrap">{client.notes}</div>
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
    </Sheet>
  )
}
