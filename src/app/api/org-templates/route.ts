import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

// GET /api/org-templates — returns { whatsapp_template, sms_template } for active org
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('whatsapp_template, sms_template')
      .eq('id', orgId)
      .single()

    if (error) throw error

    return NextResponse.json({
      whatsapp_template: data?.whatsapp_template ?? '',
      sms_template: data?.sms_template ?? '',
    })
  } catch (error: any) {
    console.error('[org-templates GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/org-templates — saves { whatsapp_template?, sms_template? }
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await request.json()
    const update: Record<string, string> = {}

    if (typeof body.whatsapp_template === 'string') update.whatsapp_template = body.whatsapp_template
    if (typeof body.sms_template === 'string') update.sms_template = body.sms_template

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase
      .from('organizations')
      .update(update)
      .eq('id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[org-templates PUT]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
