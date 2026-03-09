'use client'

import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/badge'
import { useSmsMessages } from '@/hooks/useSms'
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
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 ml-1" />
            נשלח
          </Badge>
        )
      case 'delivered':
        return (
          <Badge className="bg-blue-500 text-white">
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
        return <Badge className="bg-green-500 text-white">הושלם</Badge>
      case 'sending':
        return <Badge className="bg-blue-500 text-white">שולח</Badge>
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
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={campaign.name}
      width="600px"
    >
      <div className="space-y-6" dir="rtl">
        {/* Campaign Info */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">סטטוס:</span>
            {getCampaignStatusBadge(campaign.status)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">סוג רסלה:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{getFilterTypeLabel(campaign.filter_type)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">תאריך יצירה:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>

          {campaign.sent_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">תאריך שליחה:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{campaign.recipients_count}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">מקבלים</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{campaign.sent_count}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">נשלחו</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{campaign.failed_count}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">נכשלו</div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <MessageSquare className="w-4 h-4" />
            תוכן ההודעה
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{campaign.message}</p>
          </div>
        </div>

        {/* Messages List */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">פירוט הודעות ({messages?.length || 0})</h3>
          {messages && messages.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map((msg: any) => (
                <div 
                  key={msg.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {msg.clients ? `${msg.clients.first_name} ${msg.clients.last_name}` : '-'}
                    </p>
                    <p className="text-xs font-mono text-gray-500">{msg.phone}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(msg.status)}
                    <p className="text-xs text-gray-400 mt-1">
                      {msg.sent_at ? format(new Date(msg.sent_at), 'dd/MM HH:mm') : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">אין הודעות</div>
          )}
        </div>
      </div>
    </Modal>
  )
}
