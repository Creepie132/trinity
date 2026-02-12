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
        router.push('/dashboard')
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('sms.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('sms.subtitle')}
        </p>
      </div>

      {/* New Campaign Form */}
      <NewCampaignForm />

      {/* Campaigns History */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('sms.history')}</h2>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('common.name')}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('common.date')}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('sms.recipients')}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('sms.sent')}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('sms.failed')}</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">{t('common.status')}</TableHead>
                  <TableHead className="text-left text-gray-700 dark:text-gray-300">{t('clients.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleCampaignClick(campaign)}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{campaign.name}</TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {campaign.sent_at
                        ? format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')
                        : format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{campaign.recipients_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500 dark:bg-green-600">{campaign.sent_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.failed_count > 0 ? (
                        <Badge variant="destructive">{campaign.failed_count}</Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">0</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCampaignClick(campaign)}
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t('sms.noCampaigns')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('sms.createNew')}</p>
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
