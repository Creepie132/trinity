import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { computeNextDate, chargeInstallment } from '@/lib/installments'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/charge-installments
 * Vercel Cron — запускается ежедневно в 10:00 Israel time (07:00 UTC).
 * Находит все активные планы с next_due_date <= сегодня и списывает очередной платёж.
 */
export async function GET(request: NextRequest) {
  // Защита: только Vercel Cron или внутренние вызовы
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Берём все активные планы у которых next_due_date <= сегодня
  const { data: plans, error } = await supabase
    .from('payment_installments')
    .select('*')
    .eq('status', 'active')
    .lte('next_due_date', today)

  if (error) {
    console.error('[cron/charge-installments] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { plan_id: string; success: boolean; error?: string }[] = []

  for (const plan of (plans || [])) {
    try {
      // Получаем терминал организации
      const { data: org } = await supabase
        .from('organizations')
        .select('tranzila_token_terminal, tranzila_token_password')
        .eq('id', plan.org_id)
        .single()

      if (!org?.tranzila_token_terminal || !org?.tranzila_token_password) {
        results.push({ plan_id: plan.id, success: false, error: 'No terminal configured' })
        continue
      }

      const nextInstallmentNumber = plan.installments_paid + 1

      const chargeResult = await chargeInstallment({
        plan,
        terminal: org.tranzila_token_terminal,
        password: org.tranzila_token_password,
        installmentNumber: nextInstallmentNumber,
        supabase,
        orgId: plan.org_id,
      })

      if (chargeResult.success) {
        const newPaidCount = plan.installments_paid + 1
        const isCompleted  = newPaidCount >= plan.installments_count
        const nextDueDate  = isCompleted ? null : computeNextDate(new Date(), plan.frequency)

        await supabase
          .from('payment_installments')
          .update({
            installments_paid: newPaidCount,
            status:            isCompleted ? 'completed' : 'active',
            next_due_date:     nextDueDate ?? plan.next_due_date,
          })
          .eq('id', plan.id)

        results.push({ plan_id: plan.id, success: true })
      } else {
        // При ошибке — помечаем failed, не пробуем повторно автоматически
        await supabase
          .from('payment_installments')
          .update({ status: 'failed' })
          .eq('id', plan.id)

        results.push({ plan_id: plan.id, success: false, error: chargeResult.error })
      }
    } catch (planErr: any) {
      console.error(`[cron/charge-installments] plan ${plan.id} error:`, planErr)
      results.push({ plan_id: plan.id, success: false, error: planErr.message })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed    = results.filter(r => !r.success).length
  console.log(`[cron/charge-installments] processed ${plans?.length ?? 0} plans: ${succeeded} ok, ${failed} failed`)

  return NextResponse.json({ processed: plans?.length ?? 0, succeeded, failed, results })
}
