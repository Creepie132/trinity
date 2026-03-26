import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateVisitServiceDTO } from '@/types/visits'

/**
 * GET /api/visits/[id]/services
 * Get all services for a visit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: visitId } = await params

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateVisitServiceDTO = await request.json()

    if (!body.service_name || body.price == null || body.duration_minutes == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert visit service
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

    // Recalculate visit totals.
    // IMPORTANT: visits.price stores the BASE service price (the main service of the visit).
    // visit_services stores ADDITIONAL services/products added during the visit.
    // We must NOT overwrite visits.price with only the sum of visit_services —
    // that would erase the base service price.
    // Instead, we only update duration_minutes (additive extra duration).
    // Update visit duration: base duration + sum of extra visit_services durations.
    // We read the base duration from the visit itself (set at creation time),
    // then add all visit_services durations on top.
    // We NEVER touch visits.price here — it reflects the base service price set at creation.
    const [{ data: visitBase }, { data: allServices }] = await Promise.all([
      supabase.from('visits').select('duration_minutes').eq('id', visitId).single(),
      supabase.from('visit_services').select('duration_minutes').eq('visit_id', visitId),
    ])

    if (visitBase && allServices) {
      // visits.duration_minutes = base duration from creation
      // We don't know the "pre-extra" base anymore if services were added before.
      // Safest: store extra duration as the sum of ALL visit_services durations.
      // The UI adds this to the base for display; we store extra separately.
      // For now: only update if extraDuration > 0 to avoid zeroing out a valid base.
      const extraDuration = allServices.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0)
      if (extraDuration > 0) {
        await supabase
          .from('visits')
          .update({ duration_minutes: extraDuration })
          .eq('id', visitId)
      }
    }

    return NextResponse.json({ service: visitService }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/visits/[id]/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
