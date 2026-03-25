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

// GET /api/admin/organizations/[orgId]/tranzila
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('tranzila_terminal, tranzila_password, tranzila_token_terminal, tranzila_token_password, tranzila_invoice_terminal')
      .eq('id', orgId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const is_connected = !!(org?.tranzila_terminal)

    return NextResponse.json({
      tranzila_terminal:         org?.tranzila_terminal         ?? '',
      tranzila_password:         org?.tranzila_password         ?? '',
      tranzila_token_terminal:   org?.tranzila_token_terminal   ?? '',
      tranzila_token_password:   org?.tranzila_token_password   ?? '',
      tranzila_invoice_terminal: org?.tranzila_invoice_terminal ?? '',
      is_connected,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/admin/organizations/[orgId]/tranzila
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
      tranzila_terminal,
      tranzila_password,
      tranzila_token_terminal,
      tranzila_token_password,
      tranzila_invoice_terminal,
    } = body

    if (!tranzila_terminal?.trim()) {
      return NextResponse.json({ error: 'tranzila_terminal is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        tranzila_terminal:         tranzila_terminal.trim(),
        tranzila_password:         tranzila_password?.trim() || null,
        tranzila_token_terminal:   tranzila_token_terminal?.trim() || null,
        tranzila_token_password:   tranzila_token_password?.trim() || null,
        tranzila_invoice_terminal: tranzila_invoice_terminal?.trim() || null,
      })
      .eq('id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[orgId]/tranzila
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        tranzila_terminal:         null,
        tranzila_password:         null,
        tranzila_token_terminal:   null,
        tranzila_token_password:   null,
        tranzila_invoice_terminal: null,
      })
      .eq('id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
