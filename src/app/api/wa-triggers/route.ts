import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const TRIGGER_TYPES = [
  'visit_created', 'visit_reminder', 'visit_completed', 'client_added', 'demo_expired',
  'after_visit', 'after_sale', 'birthday', 'win_back', 'debt_reminder',
] as const

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('wa_trigger_settings')
    .select('*')
    .eq('org_id', orgId)
    .order('trigger_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ triggers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { triggers } = body
  if (!Array.isArray(triggers)) return NextResponse.json({ error: 'triggers must be array' }, { status: 400 })

  const supabase = createSupabaseServiceClient()

  const rows = triggers
    .filter((t: any) => TRIGGER_TYPES.includes(t.trigger_type))
    .map((t: any) => ({
      org_id:              orgId,
      trigger_type:        t.trigger_type,
      is_enabled:          Boolean(t.is_enabled),
      delay_min_sec:       Math.max(1, Math.min(600, parseInt(t.delay_min_sec) || 20)),
      delay_max_sec:       Math.max(1, Math.min(600, parseInt(t.delay_max_sec) || 60)),
      hours_before:        t.hours_before != null ? parseInt(t.hours_before) : null,
      delay_hours:         t.delay_hours  != null ? parseInt(t.delay_hours)  : null,
      win_back_days:       t.win_back_days != null ? parseInt(t.win_back_days) : null,
      message_template:    String(t.message_template || '').slice(0, 1000),
      attach_payment_link: Boolean(t.attach_payment_link),
    }))

  const { error } = await supabase
    .from('wa_trigger_settings')
    .upsert(rows, { onConflict: 'org_id,trigger_type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
