'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

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

interface AdBannerProps {
  category: string
  className?: string
}

export default function AdBanner({ category, className = '' }: AdBannerProps) {
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [impressionTracked, setImpressionTracked] = useState(false)

  useEffect(() => {
    async function fetchActiveCampaign() {
      try {
        const response = await fetch(`/api/ads/active?category=${category}`)
        const data = await response.json()
        
        if (data.campaigns && data.campaigns.length > 0) {
          // Get random campaign if multiple available
          const randomCampaign = data.campaigns[Math.floor(Math.random() * data.campaigns.length)]
          setCampaign(randomCampaign)
        }
      } catch (error) {
        console.error('Error fetching campaign:', error)
      }
    }

    if (category) {
      fetchActiveCampaign()
    }
  }, [category])

  // Track impression when campaign is loaded
  useEffect(() => {
    async function trackImpression() {
      if (campaign && !impressionTracked) {
        try {
          await fetch('/api/ads/impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: campaign.id })
          })
          setImpressionTracked(true)
        } catch (error) {
          console.error('Error tracking impression:', error)
        }
      }
    }

    trackImpression()
  }, [campaign, impressionTracked])

  // Track click and open link
  const handleClick = async () => {
    if (!campaign) return

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

  // Don't render anything if no campaign
  if (!campaign) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div 
        className="cursor-pointer transition-transform hover:scale-[1.02]"
        onClick={handleClick}
      >
        <div className="relative w-full h-[250px]">
          <Image
            src={campaign.banner_url}
            alt={campaign.advertiser_name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="p-2 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">שותף עסקי</p>
        </div>
      </div>
    </div>
  )
}
