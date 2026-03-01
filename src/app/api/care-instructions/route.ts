import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/care-instructions
 * List all care instructions for current organization
 */
export async function GET(request: NextRequest) {
  try {
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

    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get care instructions with joined services
    const { data: instructions, error } = await supabase
      .from('care_instructions')
      .select(`
        *,
        services (
          id,
          name,
          name_ru
        )
      `)
      .eq('org_id', orgUser.org_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] GET /api/care-instructions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instructions: instructions || [] })
  } catch (error) {
    console.error('[API] GET /api/care-instructions exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/care-instructions
 * Create new care instruction
 */
export async function POST(request: NextRequest) {
  try {
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

    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, title_ru, content, content_ru, service_id, file_url } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing required fields: title, content' }, { status: 400 })
    }

    const { data: instruction, error } = await supabase
      .from('care_instructions')
      .insert({
        org_id: orgUser.org_id,
        service_id: service_id || null,
        title,
        title_ru: title_ru || title,
        content,
        content_ru: content_ru || content,
        file_url: file_url || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] POST /api/care-instructions error:', error)
      console.error('[API] POST /api/care-instructions body:', body)
      console.error('[API] POST /api/care-instructions org_id:', orgUser.org_id)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instruction }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/care-instructions exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
