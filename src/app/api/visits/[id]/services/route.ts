import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import type { CreateVisitServiceDTO } from '@/types/visits'

/**
 * GET /api/visits/[id]/services
 * Get all services for a visit
 * Supports Bearer token (mobile) + cookie auth (web)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id } = await params

    const supabase = createSupabaseServiceClient()

    // Verify visit belongs to org
    const { data: visit } = await supabase
      .from('visits')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const { data: visitServices, error } = await supabase
      .from('visit_services')
      .select('*, services(id, name, name_ru)')
      .eq('visit_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[API] GET /api/visits/[id]/services error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(visitServices || [])
  } catch (error) {
    console.error('[API] GET /api/visits/[id]/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/visits/[id]/services
 * Add service to visit
 * Supports Bearer token (mobile) + cookie auth (web)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id: visitId } = await params

    const supabase = createSupabaseServiceClient()

    // Verify visit belongs to org
    const { data: visit } = await supabase
      .from('visits')
      .select('id, status')
      .eq('id', visitId)
      .eq('org_id', orgId)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const body: CreateVisitServiceDTO = await request.json()

    if (!body.service_name || body.price == null || body.duration_minutes == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: visitService, error } = await supabase
      .from('visit_services')
      .insert({
        visit_id: visitId,
        service_id: body.service_id || null,
        service_name: body.service_name,
        service_name_ru: body.service_name_ru || body.service_name,
        price: body.price,
        duration_minutes: body.duration_minutes,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] POST /api/visits/[id]/services error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service: visitService }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/visits/[id]/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
