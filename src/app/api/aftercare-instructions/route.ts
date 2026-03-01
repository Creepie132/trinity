import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/aftercare-instructions
 * List all aftercare instructions for current organization
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

    const { data: instructions, error } = await supabase
      .from('aftercare_instructions')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] GET /api/aftercare-instructions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instructions: instructions || [] })
  } catch (error) {
    console.error('[API] GET /api/aftercare-instructions exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/aftercare-instructions
 * Create new aftercare instruction
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
    const { title, title_ru, content, content_ru } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing required fields: title, content' }, { status: 400 })
    }

    const { data: instruction, error } = await supabase
      .from('aftercare_instructions')
      .insert({
        org_id: orgUser.org_id,
        title,
        title_ru: title_ru || title,
        content,
        content_ru: content_ru || content,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] POST /api/aftercare-instructions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instruction }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/aftercare-instructions exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
