import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/recurring-plans — список планов организации
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAuthAndFeature('subscriptions')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }
    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from('recurring_plans')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[recurring-plans GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/recurring-plans — создать план
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAuthAndFeature('subscriptions')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }
    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const body = await request.json()
    const { name, description, price, billing_cycle, custom_days } = body

    if (!name || !price || !billing_cycle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recurring_plans')
      .insert({ org_id, name, description, price, billing_cycle, custom_days: custom_days || null })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('[recurring-plans POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
