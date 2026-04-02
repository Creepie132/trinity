import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 мин — обходим все орги



const BRIEF_SYSTEM = `Ты — Кира, ИИ-ассистент CRM Trinity. Каждое утро присылаешь владельцу бизнеса короткую проактивную сводку.
Правила: 2-4 предложения. Без markdown. В женском роде. Только конкретные цифры.
Обрати внимание на проблемы: нулевые продажи, долги, пустой день.
Заканчивай советом или пожеланием удачного дня.`

// ── Сбор данных по одной организации ─────────────────────────────────────
async function collectOrgData(orgId: string, supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eod   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  // Визиты сегодня
  const { data: visits } = await supabase
    .from('visits').select('id, status')
    .eq('org_id', orgId)
    .gte('scheduled_at', today.toISOString())
    .lte('scheduled_at', eod.toISOString())

  const totalVisits     = visits?.length ?? 0
  const pendingVisits   = visits?.filter(v => v.status === 'scheduled').length ?? 0

  // Выручка вчера
  const yest      = new Date(today); yest.setDate(yest.getDate() - 1)
  const yestEnd   = new Date(yest); yestEnd.setHours(23, 59, 59)
  const { data: payments } = await supabase
    .from('payments').select('amount')
    .eq('org_id', orgId).eq('status', 'completed')
    .gte('paid_at', yest.toISOString()).lte('paid_at', yestEnd.toISOString())
  const revenueYesterday = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)

  // Долги (неоплаченные/частично оплаченные продажи)
  const { data: debts } = await supabase
    .from('sales').select('id, total_amount, paid_amount')
    .eq('org_id', orgId).in('status', ['unpaid', 'partial'])
  const debtCount  = debts?.length ?? 0
  const debtAmount = (debts ?? []).reduce(
    (s, d) => s + (Number(d.total_amount) - Number(d.paid_amount ?? 0)), 0
  )

  // Дни рождения сегодня
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const { data: bdays } = await supabase
    .from('clients').select('first_name, last_name')
    .eq('org_id', orgId).like('date_of_birth', `%-${mm}-${dd}`)
  const birthdays = (bdays ?? []).map(c => `${c.first_name} ${c.last_name ?? ''}`.trim())

  return { totalVisits, pendingVisits, revenueYesterday, debtCount, debtAmount, birthdays }
}


// ── Генерация текста Киры для одной организации ───────────────────────────
async function generateBrief(orgName: string, data: Awaited<ReturnType<typeof collectOrgData>>) {
  const bdStr = data.birthdays.length
    ? `Дни рождения сегодня: ${data.birthdays.join(', ')}.`
    : 'Именинников сегодня нет.'

  const userMsg =
    `Организация: ${orgName}.
Визиты сегодня: ${data.totalVisits} (предстоит: ${data.pendingVisits}).
Выручка вчера: ₪${Math.round(data.revenueYesterday)}.
Долги клиентов: ${data.debtCount} записей на сумму ₪${Math.round(data.debtAmount)}.
${bdStr}
Напиши короткую проактивную сводку.`

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: BRIEF_SYSTEM,
    prompt: userMsg,
    maxOutputTokens: 250,
  })
  return text?.trim() ?? null
}

// ── Доставка: INSERT + Realtime через служебный POST ──────────────────────
async function deliverBrief(
  orgId: string,
  text: string,
  supabase: ReturnType<typeof createSupabaseServiceClient>
) {
  // 1. Найти или создать сессию орга
  const { data: existing } = await supabase
    .from('kira_sessions').select('id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1).single()

  let sessionId: string
  if (existing) {
    sessionId = existing.id
  } else {
    const { data: created } = await supabase
      .from('kira_sessions').insert({ org_id: orgId }).select('id').single()
    if (!created) return
    sessionId = created.id
  }

  // 2. INSERT в kira_messages с is_proactive=true
  // Supabase Realtime автоматически рассылает INSERT-событие подписчикам
  await supabase.from('kira_messages').insert({
    session_id:   sessionId,
    org_id:       orgId,
    role:         'assistant',
    content:      text,
    is_proactive: true,
  })
}


// ── Главный обработчик GET (Vercel Cron вызывает GET) ─────────────────────
export async function GET(request: NextRequest) {
  // Защита: только Vercel Cron или ручной вызов с CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()

  // Только активные орги, не в статусе demo
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('is_active', true)
    .not('subscription_status', 'eq', 'demo')

  if (error || !orgs?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No active orgs' })
  }

  const results: { orgId: string; orgName: string; status: string }[] = []

  // Строгий for...of — данные каждого орга изолированы в своей итерации
  for (const org of orgs) {
    try {
      // 1. Собрать данные только для этого орга
      const data = await collectOrgData(org.id, supabase)

      // 2. Сгенерировать текст Киры
      const text = await generateBrief(org.name, data)
      if (!text) {
        results.push({ orgId: org.id, orgName: org.name, status: 'skipped: no text' })
        continue
      }

      // 3. Доставить в kira_messages → Realtime → UI
      await deliverBrief(org.id, text, supabase)

      results.push({ orgId: org.id, orgName: org.name, status: 'ok' })
    } catch (err: any) {
      // Ошибка одного орга не ломает весь цикл
      console.error(`[kira/cron] Error for org ${org.id}:`, err?.message)
      results.push({ orgId: org.id, orgName: org.name, status: `error: ${err?.message}` })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.filter(r => r.status === 'ok').length,
    total: orgs.length,
    results,
  })
}


