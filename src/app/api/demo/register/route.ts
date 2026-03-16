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

    if (!first_name || !last_name || !business_name || !phone || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Read pricing config from DB (server-side — source of truth)
    const DEFAULTS = { demo_setup_base: 1500, demo_module_price: 50, demo_discount_threshold: 5, demo_discount_pct: 15 }
    let pricing = DEFAULTS
    try {
      const { data: cfg } = await service.from('pricing_config').select('demo_setup_base,demo_module_price,demo_discount_threshold,demo_discount_pct').single()
      if (cfg) pricing = cfg
    } catch (_) { /* fallback to defaults */ }

    const moduleCount = (selected_modules || []).length
    const monthly_fee = moduleCount * pricing.demo_module_price
    const discount_pct = moduleCount >= pricing.demo_discount_threshold ? pricing.demo_discount_pct : 0
    const setup_fee = Math.round(pricing.demo_setup_base * (1 - discount_pct / 100))

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
