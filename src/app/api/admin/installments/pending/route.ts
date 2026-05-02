import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { computeNextDate } from '@/lib/installments'

export const dynamic = 'force-dynamic'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Проверяем что запрос от admin_users */
async function checkAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      },
    )
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return false

    const service = makeServiceClient()
    const { data } = await service
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    return !!data
  } catch { return false }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — pending-заряды старше 30 минут
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = makeServiceClient()

  // 30 минут — всё что моложе может прямо сейчас обрабатываться кроном
  const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('installment_charges')
    .select(`
      id,
      installment_plan_id,
      org_id,
      client_id,
      amount,
      installment_number,
      status,
      error_message,
      charged_at,
      created_at,
      payment_installments!installment_plan_id (
        id,
        installments_paid,
        installments_count,
        frequency,
        next_due_date,
        tranzila_token,
        tranzila_expdate
      ),
      organizations!org_id (
        id,
        name,
        display_name
      )
    `)
    .eq('status', 'pending')
    .lt('created_at', threshold)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/installments/pending] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ charges: data || [] })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — действия: mark_success | mark_failed | reset
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { charge_id, action } = body as {
    charge_id: string
    action: 'mark_success' | 'mark_failed' | 'reset'
  }

  if (!charge_id || !['mark_success', 'mark_failed', 'reset'].includes(action))
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const supabase = makeServiceClient()

  // Загружаем заряд + план (safety: только pending можно трогать)
  const { data: charge, error: fetchErr } = await supabase
    .from('installment_charges')
    .select(`
      id, installment_plan_id, org_id, installment_number, amount,
      payment_installments!installment_plan_id (
        id, installments_paid, installments_count, frequency, status, next_due_date
      )
    `)
    .eq('id', charge_id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !charge)
    return NextResponse.json({ error: 'Charge not found or not pending' }, { status: 404 })

  const plan = (charge as any).payment_installments

  // ── reset: удаляем pending → крон подберёт план завтра ──────────────────
  if (action === 'reset') {
    const { error } = await supabase
      .from('installment_charges')
      .delete()
      .eq('id', charge_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'reset' })
  }

  // ── mark_failed: pending → failed + план → failed ────────────────────────
  if (action === 'mark_failed') {
    const [chargeRes] = await Promise.all([
      supabase
        .from('installment_charges')
        .update({ status: 'failed', error_message: 'Manually marked as failed by admin' })
        .eq('id', charge_id),
      supabase
        .from('payment_installments')
        .update({ status: 'failed' })
        .eq('id', plan.id),
    ])
    if (chargeRes.error) return NextResponse.json({ error: chargeRes.error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'mark_failed' })
  }

  // ── mark_success: pending → success + обновляем счётчики плана ───────────
  if (action === 'mark_success') {
    const newPaidCount = (plan.installments_paid ?? 0) + 1
    const isCompleted  = newPaidCount >= (plan.installments_count ?? 1)
    const nextDueDate  = isCompleted ? null : computeNextDate(new Date(), plan.frequency)

    const [chargeRes] = await Promise.all([
      supabase
        .from('installment_charges')
        .update({
          status:        'success',
          charged_at:    new Date().toISOString(),
          error_message: null,
        })
        .eq('id', charge_id),
      supabase
        .from('payment_installments')
        .update({
          installments_paid: newPaidCount,
          status:            isCompleted ? 'completed' : 'active',
          next_due_date:     nextDueDate ?? plan.next_due_date,
        })
        .eq('id', plan.id),
    ])
    if (chargeRes.error) return NextResponse.json({ error: chargeRes.error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'mark_success', plan_completed: isCompleted })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
