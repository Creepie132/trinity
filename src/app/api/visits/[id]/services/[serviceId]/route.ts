import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * PATCH /api/visits/[id]/services/[serviceId]
 * Update quantity for a visit service line.
 * Body: { quantity: number }   (must be >= 1)
 *
 * DELETE /api/visits/[id]/services/[serviceId]
 * Remove service from visit
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id: visitId, serviceId } = await params

    const body = await request.json()
    const quantity = parseInt(body.quantity, 10)

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Verify the visit belongs to this org
    const { data: visit } = await supabase
      .from('visits')
      .select('id')
      .eq('id', visitId)
      .eq('org_id', orgId)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('visit_services')
      .update({ quantity })
      .eq('id', serviceId)
      .eq('visit_id', visitId)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/visits/[id]/services/[serviceId] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service: data })
  } catch (error) {
    console.error('[API] PATCH /api/visits/[id]/services/[serviceId] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id: visitId, serviceId } = await params

    const supabase = createSupabaseServiceClient()

    // Verify visit belongs to org
    const { data: visit } = await supabase
      .from('visits')
      .select('id')
      .eq('id', visitId)
      .eq('org_id', orgId)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    // Fetch service data before deletion (for duration recalc)
    const { data: serviceData } = await supabase
      .from('visit_services')
      .select('price, duration_minutes, visit_id')
      .eq('id', serviceId)
      .single()

    const { error } = await supabase
      .from('visit_services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      console.error('[API] DELETE /api/visits/[id]/services/[serviceId] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Recalculate visit duration
    if (serviceData) {
      const targetVisitId = serviceData.visit_id || visitId
      const { data: remaining } = await supabase
        .from('visit_services')
        .select('duration_minutes')
        .eq('visit_id', targetVisitId)

      const extraDuration = (remaining || []).reduce(
        (sum, s) => sum + (Number(s.duration_minutes) || 0),
        0
      )
      if (extraDuration === 0) {
        const { data: visitRow } = await supabase
          .from('visits')
          .select('services(duration_minutes)')
          .eq('id', targetVisitId)
          .single()
        const baseDuration = (visitRow as any)?.services?.duration_minutes || 60
        await supabase.from('visits').update({ duration_minutes: baseDuration }).eq('id', targetVisitId)
      } else {
        await supabase.from('visits').update({ duration_minutes: extraDuration }).eq('id', targetVisitId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/visits/[id]/services/[serviceId] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
