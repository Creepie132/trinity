import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

type Params = { params: Promise<{ id: string }> }

// POST /api/wa-inbox/[id]/create-client
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, isAdmin } = auth
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { first_name: string; last_name?: string; phone?: string; notes?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.first_name?.trim()) {
    return NextResponse.json({ error: 'first_name required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  let phone = body.phone?.trim()
  if (!phone) {
    const { data: conv } = await supabase
      .from('wa_conversations')
      .select('phone')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    phone = conv?.phone ?? ''
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      org_id: orgId,
      first_name: body.first_name.trim(),
      last_name: body.last_name?.trim() ?? '',
      phone,
      notes: body.notes?.trim() ?? null,
    })
    .select('id, first_name, last_name, phone')
    .single()

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })

  await supabase
    .from('wa_conversations')
    .update({ client_id: client.id, lead_status: 'contacted' })
    .eq('id', id)
    .eq('org_id', orgId)

  return NextResponse.json({ client })
}
