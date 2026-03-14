import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId: activeOrgId } = auth

  const body = await req.json()
  const allowed = ['receipt_sent', 'notes', 'paid_amount', 'status']
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('sales')
    .update(patch)
    .eq('id', id)
    .eq('org_id', activeOrgId)
    .select('id, receipt_sent, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
