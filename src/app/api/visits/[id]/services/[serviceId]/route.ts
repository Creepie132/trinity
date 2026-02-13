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

    const { error } = await supabase
      .from('visit_services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      console.error('[API] DELETE /api/visits/[id]/services/[serviceId] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger will auto-update visit price and duration

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/visits/[id]/services/[serviceId] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
