import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgRole, isAdmin } = auth

    if (orgRole !== 'owner' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { kpi, forecast, leadSources, topWorker, bottlenecksCount, anomaliesCount, period, lang } = body

    const isHe = lang === 'he'
    const fmt = (n: number) =>
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

    const periodLabel = period === 'today'
      ? (isHe ? 'היום' : 'сегодня')
      : period === 'week'
        ? (isHe ? 'השבוע' : 'за неделю')
        : (isHe ? 'החודש' : 'за месяц')

    const d = (v: number) => (v > 0 ? `+${v}` : String(v))

    const prompt = isHe
      ? `אתה Kira, עוזרת AI של Trinity CRM. כתוב 3-4 משפטים תמציתיים לבעל עסק בגוף שני. היה ספציפי ומספרי. תן המלצה אחת מעשית.

נתונים (${periodLabel}):
הכנסות: ${fmt(kpi.totalRevenue)} (${d(kpi.deltaRevenue)}%) | רווח נקי: ${fmt(kpi.netProfit)} (${d(kpi.deltaNetProfit)}%)
המרה: ${kpi.conversionRate}% | עסקאות: ${kpi.wonDeals}/${kpi.totalDeals}
תחזית: ${fmt(forecast.forecastRevenue)} | בצינור: ${fmt(forecast.pipelineValue)}
מקור מוביל: ${leadSources[0]?.name ?? 'לא ידוע'} (${leadSources[0]?.count ?? 0}) | עובד מוביל: ${topWorker?.email?.split('@')[0] ?? '—'} (${topWorker?.conversion ?? 0}%)
עסקאות תקועות: ${bottlenecksCount} | חריגות: ${anomaliesCount}`
      : `Ты Kira, AI-ассистент CRM Trinity. Напиши 3-4 предложения для владельца бизнеса на "ты". Будь конкретным с цифрами. Одна практическая рекомендация в конце.

Данные (${periodLabel}):
Выручка: ${fmt(kpi.totalRevenue)} (${d(kpi.deltaRevenue)}%) | Прибыль: ${fmt(kpi.netProfit)} (${d(kpi.deltaNetProfit)}%)
Конверсия: ${kpi.conversionRate}% | Сделок: ${kpi.wonDeals}/${kpi.totalDeals}
Прогноз: ${fmt(forecast.forecastRevenue)} | В воронке: ${fmt(forecast.pipelineValue)}
Топ-источник: ${leadSources[0]?.name ?? 'неизвестно'} (${leadSources[0]?.count ?? 0}) | Топ-работник: ${topWorker?.email?.split('@')[0] ?? '—'} (${topWorker?.conversion ?? 0}%)
Зависших: ${bottlenecksCount} | Аномалий: ${anomaliesCount}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')
      .trim()

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[POST /api/owner/kira-summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
