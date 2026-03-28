import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const AMBER_ORG = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// GET — public (landing + demo read this)
export async function GET() {
  try {
    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('pricing_config')
      .select('*')
      .single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[pricing-config GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PUT — admin only (Amber Solutions)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)

    // auth returns AuthContext | AuthError — check for error
    if ('error' in auth) return auth.error

    // orgId = activeOrgId in AuthContext
    if (auth.orgId !== AMBER_ORG && auth.mainOrgId !== AMBER_ORG) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      landing_plans,
      demo_setup_base,
      demo_module_price,
      demo_discount_threshold,
      demo_discount_pct,
    } = body

    const service = createSupabaseServiceClient()

    const { data: existing } = await service
      .from('pricing_config')
      .select('id')
      .single()

    if (!existing) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    const { data, error } = await service
      .from('pricing_config')
      .update({
        landing_plans,
        demo_setup_base,
        demo_module_price,
        demo_discount_threshold,
        demo_discount_pct,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    // ── Инвалидация кэша ─────────────────────────────────────────
    // Лендинг и админка получат свежие данные при следующей загрузке
    revalidatePath('/landing')
    revalidatePath('/admin/plans-editor')

    return NextResponse.json(data)
  } catch (err) {
    console.error('[pricing-config PUT]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
