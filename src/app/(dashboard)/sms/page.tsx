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
import { useLanguage } from '@/contexts/LanguageContext'

export default function SmsPage() {
  const router = useRouter()
  const features = useFeatures()
  const { t } = useLanguage()
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
        return <Badge className="bg-green-500">{t('sms.completed')}</Badge>
      case 'sending':
        return <Badge className="bg-blue-500">{t('sms.sending')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('sms.failed')}</Badge>
      case 'draft':
        return <Badge variant="secondary">{t('sms.draft')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('sms.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('sms.subtitle')}
        </p>
      </div>

      {/* New Campaign Form */}
      <NewCampaignForm />

      {/* Campaigns History */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('sms.history')}</h2>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('sms.recipients')}</TableHead>
                  <TableHead>{t('sms.sent')}</TableHead>
                  <TableHead>{t('sms.failed')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-left">{t('clients.actions')}</TableHead>
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
              <p className="text-gray-500 mb-4">{t('sms.noCampaigns')}</p>
              <p className="text-sm text-gray-400">{t('sms.createNew')}</p>
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
