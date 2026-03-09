import { NextRequest, NextResponse } from 'next/server'
import type { CreateServiceDTO } from '@/types/services'
import { validateBody, createServiceSchema } from '@/lib/validations'
import { getAuthContext } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] GET /api/services error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ services: services || [] })
  } catch (error) {
    console.error('[API] GET /api/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createServiceSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        org_id: orgId,
        name: data.name,
        name_ru: data.name_ru,
        price: data.price,
        duration_minutes: data.duration_minutes || 60,
        color: data.color || '#3B82F6',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] POST /api/services error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
