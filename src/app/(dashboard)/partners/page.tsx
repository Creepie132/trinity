'use client'

import { useState, useEffect } from 'react'
import { Handshake, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PartnersPage() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      // Загружаем для всех категорий (salon по умолчанию, потом можно брать из org)
      const res = await fetch('/api/ads/active?category=salon')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleClick(campaign: any) {
    // Засчитать клик
    try {
      await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })
    } catch (e) {}

    // Открыть ссылку
    if (campaign.link_url) {
      window.open(campaign.link_url, '_blank')
    }
  }

  async function trackImpression(campaignId: string) {
    try {
      await fetch('/api/ads/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
    } catch (e) {}
  }

  // Засчитать показы при загрузке
  useEffect(() => {
    campaigns.forEach((c) => trackImpression(c.id))
  }, [campaigns])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Handshake size={48} className="text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {locale === 'he' ? 'הצעות שותפים' : 'Партнёрские предложения'}
        </h1>
        <p className="text-slate-400">
          {locale === 'he' ? 'אין הצעות פעילות כרגע' : 'Нет активных предложений'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6">
        {locale === 'he' ? 'הצעות שותפים' : 'Партнёрские предложения'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((campaign) => (
          <button
            key={campaign.id}
            onClick={() => handleClick(campaign)}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden text-start border border-slate-200 dark:border-slate-700"
          >
            {/* Баннер */}
            {campaign.banner_url && (
              <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src={campaign.banner_url}
                  alt={campaign.advertiser_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Контент */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {campaign.advertiser_name}
                </h3>
                <ExternalLink size={16} className="text-slate-400 flex-shrink-0" />
              </div>

              {/* Период */}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {new Date(campaign.start_date).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}{' '}
                —{' '}
                {new Date(campaign.end_date).toLocaleDateString(
                  locale === 'he' ? 'he-IL' : 'ru-RU'
                )}
              </p>

              {/* Статистика */}
              <div className="flex gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>👁 {campaign.impressions}</span>
                <span>👆 {campaign.clicks}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
