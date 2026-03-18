import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

type Params = { params: Promise<{ id: string }> }

// POST /api/wa-inbox/[id]/create-visit
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let body: {
    client_id: string
    scheduled_at: string
    service_description?: string
    notes?: string
    staff_id?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.client_id || !body.scheduled_at) {
    return NextResponse.json({ error: 'client_id and scheduled_at required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      org_id: orgId,
      client_id: body.client_id,
      scheduled_at: body.scheduled_at,
      service_description: body.service_description ?? null,
      notes: body.notes ?? null,
      staff_id: body.staff_id ?? null,
      status: 'scheduled',
    })
    .select('id, scheduled_at, service_description, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('wa_conversations')
    .update({ lead_status: 'demo_scheduled', status: 'in_progress' })
    .eq('id', id)
    .eq('org_id', orgId)

  return NextResponse.json({ visit })
}
