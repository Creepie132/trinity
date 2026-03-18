import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function requireAdmin(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: adminRow } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
  return adminRow ? user : null
}

const VALID_PROVIDERS = ['tranzila', 'morning', 'none'] as const
const VALID_TRIGGERS  = ['payment_created', 'payment_completed'] as const

// GET /api/admin/organizations/[orgId]/receipt-settings
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params

    const { data, error } = await supabaseAdmin
      .from('org_receipt_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return defaults if not configured yet
    if (!data) {
      return NextResponse.json({
        settings: {
          org_id: orgId,
          is_enabled: false,
          provider: 'none',
          trigger_events: ['payment_created'],
          message_template: 'שלום {{client_name}}, קיבלנו את תשלומך בסך {{amount}} ₪. מצורפת קבלה לתשלום. תודה!',
        }
      })
    }

    return NextResponse.json({ settings: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/admin/organizations/[orgId]/receipt-settings
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params
    const body = await request.json()

    const {
      is_enabled = false,
      provider = 'none',
      trigger_events = ['payment_created'],
      message_template = '',
    } = body

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: `Invalid provider: ${provider}` }, { status: 400 })
    }

    if (!Array.isArray(trigger_events) || trigger_events.some((t: string) => !VALID_TRIGGERS.includes(t as any))) {
      return NextResponse.json({ error: 'Invalid trigger_events' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('org_receipt_settings')
      .upsert(
        {
          org_id: orgId,
          is_enabled: Boolean(is_enabled),
          provider,
          trigger_events,
          message_template: String(message_template).slice(0, 1000),
        },
        { onConflict: 'org_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ settings: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
