import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

/**
 * PATCH /api/care-instructions/[id]
 * Update care instruction
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const body = await request.json()

    const { data: instruction, error } = await supabase
      .from('care_instructions')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/care-instructions/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instruction })
  } catch (error) {
    console.error('[API] PATCH /api/care-instructions/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/care-instructions/[id]
 * Soft delete (set is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const { data: instruction, error } = await supabase
      .from('care_instructions')
      .update({ is_active: false })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] DELETE /api/care-instructions/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instruction })
  } catch (error) {
    console.error('[API] DELETE /api/care-instructions/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
