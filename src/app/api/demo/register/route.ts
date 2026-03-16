import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      first_name, last_name, business_name, phone,
      address, city, country, email,
      selected_modules,
    } = body

    // Validate required fields
    if (!first_name || !last_name || !business_name || !phone || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate pricing
    const moduleCount = (selected_modules || []).length
    const SETUP_BASE = 1500
    const MODULE_MONTHLY = 50
    const DISCOUNT_THRESHOLD = 5
    const DISCOUNT_PCT = 15

    const monthly_fee = moduleCount * MODULE_MONTHLY
    const discount_pct = moduleCount >= DISCOUNT_THRESHOLD ? DISCOUNT_PCT : 0
    const setup_fee = Math.round(SETUP_BASE * (1 - discount_pct / 100))

    const service = createSupabaseServiceClient()

    const { data: reg, error } = await service
      .from('demo_registrations')
      .insert({
        first_name,
        last_name,
        business_name,
        phone,
        address: address || null,
        city: city || null,
        country,
        email: email || null,
        selected_modules: selected_modules || [],
        setup_fee,
        monthly_fee,
        discount_pct,
        status: 'pending',
      })
      .select('id, setup_fee, monthly_fee, discount_pct')
      .single()

    if (error || !reg) {
      console.error('[demo/register] DB error:', error)
      return NextResponse.json({ error: 'Failed to save registration' }, { status: 500 })
    }

    return NextResponse.json({
      registration_id: reg.id,
      setup_fee: reg.setup_fee,
      monthly_fee: reg.monthly_fee,
      discount_pct: reg.discount_pct,
    })
  } catch (err) {
    console.error('[demo/register] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
