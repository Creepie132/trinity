import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/visits/[id]/status
 * Update visit status (start, cancel)
 */
export async function PATCH(
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

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400 })
    }

    const updateData: any = { status }

    // If starting visit, record started_at timestamp
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    }

    const { data: visit, error } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/visits/[id]/status error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ visit })
  } catch (error) {
    console.error('[API] PATCH /api/visits/[id]/status exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
