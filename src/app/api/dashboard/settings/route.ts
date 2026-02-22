import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем orgId пользователя
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Читаем настройки через admin (обходит RLS)
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', orgUser.org_id)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    console.log('=== SETTINGS SAVE DEBUG ===')
    console.log('User ID:', user.id)
    console.log('Body:', body)

    // Получаем orgId пользователя
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    console.log('Org ID:', orgUser.org_id)

    // Читаем текущие features
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('features')
      .eq('id', orgUser.org_id)
      .single()

    const currentFeatures = org?.features || {}

    console.log('Current features:', currentFeatures)
    console.log('Dashboard charts to save:', body.dashboard_charts)

    // Обновляем dashboard_charts напрямую в features (без wrapper dashboard_settings)
    const updatedFeatures = {
      ...currentFeatures,
      dashboard_charts: body.dashboard_charts || body,
    }

    console.log('Updated features:', updatedFeatures)

    // Сохраняем через admin (обходит RLS)
    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ features: updatedFeatures })
      .eq('id', orgUser.org_id)

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
