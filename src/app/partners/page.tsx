'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFeatures } from '@/hooks/useFeatures'

interface AdCampaign {
  id: string
  advertiser_name: string
  banner_url: string
  link_url: string
  target_categories: string[]
  start_date: string
  end_date: string
  is_active: boolean
  clicks: number
  impressions: number
}

export default function PartnersPage() {
  const router = useRouter()
  const features = useFeatures()
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)

  // Check organization status
  useEffect(() => {
    if (!features.isLoading && !features.isActive) {
      router.push('/blocked')
    }
  }, [features.isActive, features.isLoading, router])

  useEffect(() => {
    async function fetchCampaigns() {
      if (features.isLoading) return

      try {
        const response = await fetch(`/api/ads/active?category=${features.category}`)
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [features.category, features.isLoading])

  const handleClick = async (campaign: AdCampaign) => {
    try {
      await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id })
      })
      
      window.open(campaign.link_url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error tracking click:', error)
      window.open(campaign.link_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">הצעות שותפים</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="bg-gray-200 h-[250px] rounded mb-4" />
              <div className="bg-gray-200 h-6 rounded w-3/4 mb-2" />
              <div className="bg-gray-200 h-10 rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">הצעות שותפים</h1>
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">אין הצעות זמינות כרגע</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">הצעות שותפים</h1>
        <p className="text-gray-600">גלה מוצרים ושירותים מומלצים לעסק שלך</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative w-full h-[250px]">
              <Image
                src={campaign.banner_url}
                alt={campaign.advertiser_name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">{campaign.advertiser_name}</h3>
              <Button 
                onClick={() => handleClick(campaign)}
                className="w-full"
                variant="default"
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                לפרטים
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
