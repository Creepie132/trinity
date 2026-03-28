import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

/** GET /api/payments/settings — настройки платежей */
export async function GET() {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return (auth as any).error

    const { orgId, supabase } = auth as any
    const { data, error } = await supabase
      .from('organizations')
      .select('tranzila_terminal, tranzila_terminal_name, tranzila_password, tranzila_token_terminal, tranzila_token_password, enabled_payment_methods')
      .eq('id', orgId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const DEFAULT_METHODS = ['cash', 'card', 'bit', 'bank_transfer', 'check']

    // Терминал считается подключённым если задан tranzila_terminal ИЛИ tranzila_terminal_name
    const terminalConnected = !!(data?.tranzila_terminal || data?.tranzila_terminal_name)

    return NextResponse.json({
      tranzila_terminal:          data?.tranzila_terminal || '',
      tranzila_terminal_name:     data?.tranzila_terminal_name || '',
      tranzila_password_set:      !!(data?.tranzila_password),
      tranzila_token_terminal:    data?.tranzila_token_terminal || '',
      tranzila_token_password_set: !!(data?.tranzila_token_password),
      terminal_connected:         terminalConnected,
      enabled_payment_methods:    data?.enabled_payment_methods ?? DEFAULT_METHODS,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT /api/payments/settings — сохранить настройки */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return (auth as any).error

    const { orgId, supabase } = auth as any
    const body = await request.json()
    const {
      tranzila_terminal, tranzila_password,
      tranzila_token_terminal, tranzila_token_password,
      enabled_payment_methods,
    } = body

    const payload: Record<string, any> = {}

    if (tranzila_terminal !== undefined) {
      payload.tranzila_terminal = tranzila_terminal?.trim() || null
    }
    if (tranzila_password !== undefined) {
      payload.tranzila_password = tranzila_password?.trim() || null
    }
    if (tranzila_token_terminal !== undefined) {
      payload.tranzila_token_terminal = tranzila_token_terminal?.trim() || null
    }
    if (tranzila_token_password !== undefined) {
      payload.tranzila_token_password = tranzila_token_password?.trim() || null
    }
    if (Array.isArray(enabled_payment_methods)) {
      payload.enabled_payment_methods = enabled_payment_methods
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
