import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const today = new Date().toISOString().split('T')[0]

    // Fetch all active campaigns in date range — filter by category in JS
    // Campaigns with empty target_categories are shown to everyone
    const { data: allCampaigns, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active campaigns:', error)
      return NextResponse.json({ campaigns: [] })
    }

    // Filter: show if no target categories (universal) OR if category matches
    const campaigns = (allCampaigns || []).filter((c) => {
      if (!c.target_categories || c.target_categories.length === 0) return true
      if (!category) return true
      return c.target_categories.includes(category)
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error in active campaigns route:', error)
    return NextResponse.json({ campaigns: [] })
  }
}
