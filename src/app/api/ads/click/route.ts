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
      .select('clicks')
      .eq('id', campaign_id)
      .single()

    if (fetchError || !campaign) {
      console.error('Error fetching campaign:', fetchError)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Increment clicks
    const { data, error } = await supabase
      .from('ad_campaigns')
      .update({ clicks: campaign.clicks + 1 })
      .eq('id', campaign_id)
      .select()
      .single()

    if (error) {
      console.error('Error incrementing clicks:', error)
      return NextResponse.json(
        { error: 'Failed to increment clicks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, clicks: data.clicks })
  } catch (error) {
    console.error('Error in click route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
