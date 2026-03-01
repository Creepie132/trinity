import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/aftercare-instructions/[id]
 * Update an aftercare instruction
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

    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: any = { updated_at: new Date().toISOString() }

    if (body.title !== undefined) updates.title = body.title
    if (body.title_ru !== undefined) updates.title_ru = body.title_ru
    if (body.content !== undefined) updates.content = body.content
    if (body.content_ru !== undefined) updates.content_ru = body.content_ru

    const { data: instruction, error } = await supabase
      .from('aftercare_instructions')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgUser.org_id)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/aftercare-instructions/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }

    return NextResponse.json({ instruction })
  } catch (error) {
    console.error('[API] PATCH /api/aftercare-instructions/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/aftercare-instructions/[id]
 * Delete an aftercare instruction
 */
export async function DELETE(
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

    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: instruction, error } = await supabase
      .from('aftercare_instructions')
      .delete()
      .eq('id', id)
      .eq('org_id', orgUser.org_id)
      .select()
      .single()

    if (error) {
      console.error('[API] DELETE /api/aftercare-instructions/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }

    return NextResponse.json({ instruction })
  } catch (error) {
    console.error('[API] DELETE /api/aftercare-instructions/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
