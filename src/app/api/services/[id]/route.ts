import { NextRequest, NextResponse } from 'next/server'
import type { UpdateServiceDTO } from '@/types/services'
import { getAuthContext, requireOrgRole, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const serviceId = params.id

    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    const body: UpdateServiceDTO = await request.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.name_ru !== undefined) updateData.name_ru = body.name_ru
    if (body.price !== undefined) updateData.price = body.price
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes
    if (body.color !== undefined) updateData.color = body.color
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', serviceId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/services/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('[API] PATCH /api/services/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const serviceId = params.id

    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    // ✅ Проверка роли (только owner/moderator)
    try {
      await requireOrgRole(orgId, ["owner", "moderator"])
    } catch (e) {
      return authErrorResponse(e)
    }

    const { data: service, error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] DELETE /api/services/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('[API] DELETE /api/services/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
