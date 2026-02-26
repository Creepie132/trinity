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

    if (!body.service_name || !body.price || !body.duration_minutes) {
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

    // Trigger will auto-update visit price and duration

    return NextResponse.json({ service: visitService }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/visits/[id]/services exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
