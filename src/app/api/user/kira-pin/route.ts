import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET — проверить установлен ли PIN (без возврата значения)
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data: { user } } = await supabase.auth.admin.getUserById(auth.user.id)
  const hasPIN = !!(user?.user_metadata?.kira_pin)

  return NextResponse.json({ has_pin: hasPIN })
}

// POST — установить или сменить PIN
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  let pin: string
  let current_pin: string | undefined

  try {
    const body = await request.json()
    pin = String(body.pin ?? '').trim()
    current_pin = body.current_pin ? String(body.current_pin).trim() : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN должен быть ровно 4 цифры' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data: { user }, error: fetchErr } = await supabase.auth.admin.getUserById(auth.user.id)
  if (fetchErr || !user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  const meta = (user.user_metadata as Record<string, any>) ?? {}

  // Если PIN уже установлен — требуем текущий
  if (meta.kira_pin && meta.kira_pin !== current_pin) {
    return NextResponse.json({ error: 'Неверный текущий PIN' }, { status: 403 })
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(auth.user.id, {
    user_metadata: { ...meta, kira_pin: pin },
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
// DELETE — сбросить PIN (требует текущий)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  let current_pin: string
  try {
    const body = await request.json()
    current_pin = String(body.current_pin ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data: { user }, error: fetchErr } = await supabase.auth.admin.getUserById(auth.user.id)
  if (fetchErr || !user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  const meta = (user.user_metadata as Record<string, any>) ?? {}
  if (!meta.kira_pin) return NextResponse.json({ error: 'PIN не установлен' }, { status: 400 })
  if (meta.kira_pin !== current_pin) return NextResponse.json({ error: 'Неверный PIN' }, { status: 403 })

  const { kira_pin: _removed, ...restMeta } = meta
  const { error: updateErr } = await supabase.auth.admin.updateUserById(auth.user.id, {
    user_metadata: restMeta,
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
