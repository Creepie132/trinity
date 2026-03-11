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

    // Subtract service price from visit
    if (serviceData) {
      const targetVisitId = serviceData.visit_id || visitId
      const { data: currentVisit } = await supabase
        .from('visits')
        .select('price, duration_minutes')
        .eq('id', targetVisitId)
        .single()

      if (currentVisit) {
        await supabase
          .from('visits')
          .update({
            price: Math.max(0, (currentVisit.price || 0) - (serviceData.price || 0)),
            duration_minutes: Math.max(0, (currentVisit.duration_minutes || 0) - (serviceData.duration_minutes || 0)),
          })
          .eq('id', targetVisitId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/visits/[id]/services/[serviceId] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
