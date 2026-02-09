import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { campaign_id } = await request.json()

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // Get current campaign
    const { data: campaign, error: fetchError } = await supabase
      .from('ad_campaigns')
      .select('impressions')
      .eq('id', campaign_id)
      .single()

    if (fetchError || !campaign) {
      console.error('Error fetching campaign:', fetchError)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Increment impressions
    const { data, error } = await supabase
      .from('ad_campaigns')
      .update({ impressions: campaign.impressions + 1 })
      .eq('id', campaign_id)
      .select()
      .single()

    if (error) {
      console.error('Error incrementing impressions:', error)
      return NextResponse.json(
        { error: 'Failed to increment impressions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, impressions: data.impressions })
  } catch (error) {
    console.error('Error in impression route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
