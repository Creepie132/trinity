import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/apply-plan-changes
 *
 * Запускается ежедневно (Vercel Cron).
 * Применяет запланированные downgrade когда pending_plan_date <= today.
 *
 * Vercel cron.json: { "crons": [{ "path": "/api/cron/apply-plan-changes", "schedule": "0 3 * * *" }] }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Выбираем все организации с pending_plan_date <= сегодня
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, pending_plan, pending_plan_price, pending_plan_date')
    .not('pending_plan', 'is', null)
    .lte('pending_plan_date', today)

  if (error) {
    console.error('[apply-plan-changes] DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, applied: 0 })
  }

  let applied = 0
  const errors: string[] = []

  for (const org of orgs) {
    try {
      const nextBilling = new Date()
      nextBilling.setDate(nextBilling.getDate() + 30)

      const { error: updErr } = await supabase
        .from('organizations')
        .update({
          plan:              org.pending_plan,
          billing_amount:    org.pending_plan_price,
          billing_due_date:  nextBilling.toISOString().split('T')[0],
          pending_plan:      null,
          pending_plan_price: null,
          pending_plan_date:  null,
        })
        .eq('id', org.id)

      if (updErr) throw updErr
      applied++
      console.log(`[apply-plan-changes] ✅ Applied ${org.pending_plan} for org ${org.id} (${org.name})`)
    } catch (e: any) {
      errors.push(`${org.id}: ${e.message}`)
      console.error(`[apply-plan-changes] ❌ Failed for org ${org.id}:`, e)
    }
  }

  return NextResponse.json({ ok: true, applied, errors: errors.length ? errors : undefined })
}
