import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chargeByToken } from '@/lib/tranzila'

// Используем service role для cron (admin права)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface BillingResult {
  orgId: string
  orgName: string
  status: 'success' | 'failed' | 'skipped'
  amount?: number
  error?: string
  transactionId?: string
}

/**
 * CRON: Ежедневное списание подписок
 * Запускается в 09:00 по израильскому времени
 * 
 * Vercel Cron: 0 6 * * * (06:00 UTC = 09:00 Israel)
 */
export async function GET(request: NextRequest) {
  // Защита от случайного вызова
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CRON Billing] Starting daily billing run')

  const today = new Date().toISOString().split('T')[0]
  const results: BillingResult[] = []

  try {
    // Находим организации у которых:
    // 1. Сегодня дата списания (billing_due_date)
    // 2. Статус подписки active
    // 3. Есть сохранённый токен карты
    const { data: orgs, error: fetchError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id, 
        name, 
        tranzila_card_token, 
        tranzila_card_expiry,
        tranzila_terminal, 
        tranzila_password, 
        billing_amount,
        billing_due_date,
        subscription_status
      `)
      .eq('billing_due_date', today)
      .in('subscription_status', ['active', 'manual'])
      .not('tranzila_card_token', 'is', null)

    if (fetchError) {
      console.error('[CRON Billing] Error fetching orgs:', fetchError)
      throw fetchError
    }

    if (!orgs?.length) {
      console.log('[CRON Billing] No billing due today')
      return NextResponse.json({ 
        message: 'No billing due today', 
        date: today,
        count: 0 
      })
    }

    console.log(`[CRON Billing] Found ${orgs.length} organizations to bill`)

    // Обрабатываем каждую организацию
    for (const org of orgs) {
      const result: BillingResult = {
        orgId: org.id,
        orgName: org.name,
        status: 'failed',
      }

      try {
        // Проверяем наличие суммы
        if (!org.billing_amount || org.billing_amount <= 0) {
          result.status = 'skipped'
          result.error = 'No billing amount set'
          results.push(result)
          continue
        }

        console.log(`[CRON Billing] Processing ${org.name} (${org.id}), amount: ${org.billing_amount}₪`)

        // Списываем через Tranzila
        const chargeResult = await chargeByToken({
          token: org.tranzila_card_token!,
          amount: org.billing_amount,
          description: `Trinity CRM подписка — ${org.name}`,
          terminal: org.tranzila_terminal || process.env.TRANZILA_TERMINAL,
          password: org.tranzila_password || process.env.TRANZILA_PASSWORD,
          expdate: org.tranzila_card_expiry,
        })

        // Следующая дата списания — +1 месяц
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        const nextDateStr = nextDate.toISOString().split('T')[0]

        // Обновляем организацию
        await supabaseAdmin
          .from('organizations')
          .update({
            billing_due_date: nextDateStr,
            billing_status: 'paid',
            last_billing_date: today,
            last_billing_amount: org.billing_amount,
          })
          .eq('id', org.id)

        // Логируем успех в subscription_billing_log
        await supabaseAdmin.from('subscription_billing_log').insert({
          org_id: org.id,
          amount: org.billing_amount,
          status: 'success',
          transaction_id: chargeResult.transactionId,
          period_start: today,
          period_end: nextDateStr,
          card_last4: chargeResult.last4,
          created_at: new Date().toISOString(),
        })

        // Создаём запись в payments
        await supabaseAdmin.from('payments').insert({
          org_id: org.id,
          amount: org.billing_amount,
          status: 'completed',
          payment_method: 'card',
          provider: 'tranzila',
          type: 'subscription',
          transaction_id: chargeResult.transactionId,
          description: 'Trinity CRM ежемесячная подписка',
          paid_at: new Date().toISOString(),
          metadata: {
            subscription_period_start: today,
            subscription_period_end: nextDateStr,
            card_last4: chargeResult.last4,
            approval_number: chargeResult.approvalNumber,
          },
        })

        result.status = 'success'
        result.amount = org.billing_amount
        result.transactionId = chargeResult.transactionId

        console.log(`[CRON Billing] ✅ ${org.name} charged successfully: ${org.billing_amount}₪`)

      } catch (chargeError: any) {
        console.error(`[CRON Billing] ❌ Error charging ${org.name}:`, chargeError.message)

        result.status = 'failed'
        result.error = chargeError.message

        // Логируем ошибку
        await supabaseAdmin.from('subscription_billing_log').insert({
          org_id: org.id,
          amount: org.billing_amount,
          status: 'failed',
          error_message: chargeError.message,
          period_start: today,
          created_at: new Date().toISOString(),
        })

        // Обновляем статус организации
        await supabaseAdmin
          .from('organizations')
          .update({
            billing_status: 'failed',
            billing_error: chargeError.message,
            billing_retry_count: (org as any).billing_retry_count 
              ? (org as any).billing_retry_count + 1 
              : 1,
          })
          .eq('id', org.id)

        // Отправляем уведомление админу о неудачном списании
        await notifyBillingFailure(org, chargeError.message)
      }

      results.push(result)
    }

    // Итоговая статистика
    const successful = results.filter(r => r.status === 'success')
    const failed = results.filter(r => r.status === 'failed')
    const skipped = results.filter(r => r.status === 'skipped')
    const totalAmount = successful.reduce((sum, r) => sum + (r.amount || 0), 0)

    console.log(`[CRON Billing] Completed: ${successful.length} success, ${failed.length} failed, ${skipped.length} skipped`)
    console.log(`[CRON Billing] Total charged: ${totalAmount}₪`)

    // Отправляем итоговый отчёт админу
    await sendBillingSummary(results, totalAmount)

    return NextResponse.json({
      success: true,
      date: today,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        skipped: skipped.length,
        totalAmount,
      },
      results,
    })

  } catch (error: any) {
    console.error('[CRON Billing] Fatal error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Уведомление о неудачном списании
 */
async function notifyBillingFailure(org: any, errorMessage: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) return

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: [
          '❌ Ошибка списания подписки',
          '',
          `🏢 ${org.name}`,
          `💰 ${org.billing_amount}₪`,
          `🔴 ${errorMessage}`,
          '',
          'Требуется ручная проверка карты клиента.',
        ].join('\n'),
      }),
    })
  } catch (e) {
    console.error('[CRON Billing] Failed to send Telegram notification:', e)
  }
}

/**
 * Итоговый отчёт о биллинге
 */
async function sendBillingSummary(results: BillingResult[], totalAmount: number) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) return
  if (results.length === 0) return

  const successful = results.filter(r => r.status === 'success')
  const failed = results.filter(r => r.status === 'failed')

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: [
          '📊 Отчёт биллинга Trinity CRM',
          '',
          `✅ Успешно: ${successful.length}`,
          `❌ Ошибки: ${failed.length}`,
          `💰 Всего: ${totalAmount}₪`,
          '',
          failed.length > 0 
            ? `⚠️ Требуют внимания:\n${failed.map(f => `• ${f.orgName}`).join('\n')}`
            : '🎉 Все платежи прошли успешно!',
        ].join('\n'),
      }),
    })
  } catch (e) {
    console.error('[CRON Billing] Failed to send summary:', e)
  }
}
