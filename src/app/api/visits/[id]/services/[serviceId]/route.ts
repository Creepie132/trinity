import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/visits/[id]/services/[serviceId]
 * Remove service from visit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; serviceId: string }> }
) {
  try {
    const { serviceId } = await params

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

    const { id: visitId } = await params

    // Fetch service price before deleting
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

    // Update visit duration only — NEVER touch visits.price.
    // visits.price = base service price (immutable after creation).
    // Total shown in UI = visits.price + sum(visit_services.price) computed dynamically.
    if (serviceData) {
      const targetVisitId = serviceData.visit_id || visitId
      const { data: remaining } = await supabase
        .from('visit_services')
        .select('duration_minutes')
        .eq('visit_id', targetVisitId)

      const extraDuration = (remaining || []).reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0)
      if (extraDuration === 0) {
        // All extras removed — restore base visit duration from service
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
