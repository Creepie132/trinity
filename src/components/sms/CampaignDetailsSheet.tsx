'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSmsCampaign, useSmsMessages } from '@/hooks/useSms'
import { SmsCampaign } from '@/types/database'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react'

interface CampaignDetailsSheetProps {
  campaign: SmsCampaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignDetailsSheet({ campaign, open, onOpenChange }: CampaignDetailsSheetProps) {
  const { data: messages } = useSmsMessages(campaign?.id)

  if (!campaign) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 ml-1" />
            נשלח
          </Badge>
        )
      case 'delivered':
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="w-3 h-3 ml-1" />
            נמסר
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 ml-1" />
            נכשל
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 ml-1" />
            ממתין
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">הושלם</Badge>
      case 'sending':
        return <Badge className="bg-blue-500">שולח</Badge>
      case 'failed':
        return <Badge variant="destructive">נכשל</Badge>
      case 'draft':
        return <Badge variant="secondary">טיוטה</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getFilterTypeLabel = (type: string) => {
    switch (type) {
      case 'all':
        return 'כל הלקוחות'
      case 'single':
        return 'לקוח בודד'
      case 'inactive_days':
        return `לקוחות לא פעילים (${campaign.filter_value} ימים)`
      default:
        return type
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{campaign.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Campaign Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">סטטוס:</span>
              {getCampaignStatusBadge(campaign.status)}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">סוג רסלה:</span>
              <span className="font-medium">{getFilterTypeLabel(campaign.filter_type)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">תאריך יצירה:</span>
              <span className="font-medium">
                {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>

            {campaign.sent_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">תאריך שליחה:</span>
                <span className="font-medium">
                  {format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{campaign.recipients_count}</div>
              <div className="text-sm text-gray-600">מקבלים</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{campaign.sent_count}</div>
              <div className="text-sm text-gray-600">נשלחו</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{campaign.failed_count}</div>
              <div className="text-sm text-gray-600">נכשלו</div>
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              תוכן ההודעה
            </h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="whitespace-pre-wrap">{campaign.message}</p>
            </div>
          </div>

          {/* Messages List */}
          <div>
            <h3 className="font-semibold mb-3">פירוט הודעות ({messages?.length || 0})</h3>
            {messages && messages.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>לקוח</TableHead>
                      <TableHead>טלפון</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>תאריך</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg: any) => (
                      <TableRow key={msg.id}>
                        <TableCell>
                          {msg.clients
                            ? `${msg.clients.first_name} ${msg.clients.last_name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{msg.phone}</TableCell>
                        <TableCell>{getStatusBadge(msg.status)}</TableCell>
                        <TableCell className="text-sm">
                          {msg.sent_at
                            ? format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">אין הודעות</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
