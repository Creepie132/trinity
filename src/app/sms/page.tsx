'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSmsCampaigns } from '@/hooks/useSms'
import { NewCampaignForm } from '@/components/sms/NewCampaignForm'
import { CampaignDetailsSheet } from '@/components/sms/CampaignDetailsSheet'
import { SmsCampaign } from '@/types/database'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'

export default function SmsPage() {
  const router = useRouter()
  const features = useFeatures()
  const [selectedCampaign, setSelectedCampaign] = useState<SmsCampaign | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const { data: campaigns, isLoading } = useSmsCampaigns()

  // Check feature access and organization status
  useEffect(() => {
    if (!features.isLoading) {
      if (!features.isActive) {
        router.push('/blocked')
      } else if (!features.hasSms) {
        router.push('/')
      }
    }
  }, [features.hasSms, features.isActive, features.isLoading, router])

  const handleCampaignClick = (campaign: SmsCampaign) => {
    setSelectedCampaign(campaign)
    setDetailsOpen(true)
  }

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">הודעות SMS</h1>
        <p className="text-gray-600 mt-1">
          נהל רסלות SMS ללקוחות
        </p>
      </div>

      {/* New Campaign Form */}
      <NewCampaignForm />

      {/* Campaigns History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">היסטוריית רסלות</h2>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">טוען...</div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>מקבלים</TableHead>
                  <TableHead>נשלחו</TableHead>
                  <TableHead>נכשלו</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleCampaignClick(campaign)}
                  >
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      {campaign.sent_at
                        ? format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')
                        : format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.recipients_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">{campaign.sent_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.failed_count > 0 ? (
                        <Badge variant="destructive">{campaign.failed_count}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCampaignClick(campaign)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">אין רסלות</p>
              <p className="text-sm text-gray-400">צור רסלה חדשה למעלה</p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Sheet */}
      <CampaignDetailsSheet
        campaign={selectedCampaign}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}
