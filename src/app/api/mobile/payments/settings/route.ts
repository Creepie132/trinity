/**
 * GET  /api/mobile/payments/settings
 * PUT  /api/mobile/payments/settings
 * Auth: Bearer (mobile) or cookie (web)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_METHODS = new Set(['cash', 'card', 'bit', 'bank_transfer', 'check', 'paybox'])
const DEFAULT_METHODS = ['cash', 'card', 'bit', 'bank_transfer', 'check']

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('tranzila_terminal, tranzila_password, enabled_payment_methods')
      .eq('id', orgId)
      .single()

    if (error) {
      console.error('[mobile/payments/settings GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const rawMethods: string[] = data?.enabled_payment_methods ?? DEFAULT_METHODS
    const methods = rawMethods
      .map((m: string) => m === 'credit_card' ? 'card' : m === 'tranzila' ? 'card' : m)
      .filter((m, i, arr) => arr.indexOf(m) === i) // deduplicate
    const terminalConnected = !!(data?.tranzila_terminal?.trim())

    return NextResponse.json({
      enabled_payment_methods: methods,
      terminal_connected: terminalConnected,
      tranzila_terminal: data?.tranzila_terminal || '',
      tranzila_password_set: !!(data?.tranzila_password),
    })
  } catch (e) {
    console.error('[mobile/payments/settings GET] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { enabled_payment_methods } = body as { enabled_payment_methods?: unknown }

    if (!Array.isArray(enabled_payment_methods) || enabled_payment_methods.length === 0) {
      return NextResponse.json({ error: 'enabled_payment_methods must be a non-empty array' }, { status: 400 })
    }

    for (const m of enabled_payment_methods) {
      if (typeof m !== 'string' || !VALID_METHODS.has(m)) {
        return NextResponse.json({ error: `Invalid method: ${m}` }, { status: 400 })
      }
    }

    const normalized = (enabled_payment_methods as string[])
      .map((m: string) => m === 'credit_card' ? 'card' : m === 'tranzila' ? 'card' : m)
      .filter((m, i, arr) => arr.indexOf(m) === i) // deduplicate

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase
      .from('organizations')
      .update({ enabled_payment_methods: normalized, updated_at: new Date().toISOString() })
      .eq('id', orgId)

    if (error) {
      console.error('[mobile/payments/settings PUT]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, enabled_payment_methods: normalized })
  } catch (e) {
    console.error('[mobile/payments/settings PUT] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
