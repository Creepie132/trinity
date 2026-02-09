import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json(
        { error: 'category parameter is required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get active campaigns for this category
    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .contains('target_categories', [category])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error('Error in active campaigns route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
