import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    // Читаем настройки через admin (обходит RLS)
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    if (error) {
      console.error('=== SETTINGS GET ERROR ===')
      console.error('Error:', error)
      console.error('Error message:', error?.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      settings: org?.features || {},
      dashboard_charts: org?.features?.dashboard_charts || {
        revenue: true,
        visits: true,
        topClients: true,
      },
    })
  } catch (error: any) {
    console.error('=== SETTINGS GET ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    const body = await request.json()

    // Читаем текущие features
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    const currentFeatures = org?.features || {}

    // Обновляем dashboard_charts напрямую в features (без wrapper dashboard_settings)
    const updatedFeatures = {
      ...currentFeatures,
      dashboard_charts: body.dashboard_charts || body,
    }

    // Сохраняем через admin (обходит RLS)
    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ features: updatedFeatures })
      .eq('id', orgId)

    if (error) {
      console.error('=== SETTINGS SAVE DB ERROR ===')
      console.error('Error:', error)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('=== SETTINGS SAVED SUCCESSFULLY ===')

    return NextResponse.json({
      success: true,
      dashboard_charts: body.dashboard_charts || body,
    })
  } catch (error: any) {
    console.error('=== SETTINGS SAVE ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
