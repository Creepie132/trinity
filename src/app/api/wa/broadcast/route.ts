/**
 * GET  /api/wa/broadcast  — статус лимита (сколько отправлено за 24ч)
 * POST /api/wa/broadcast  — отправить рассылку
 *
 * Лимит: 30 сообщений за 24 часа на org.
 * BiDi: автоматическая RTL-коррекция для ивритских шаблонов.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext }            from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage }         from '@/lib/wa/send'

export const dynamic = 'force-dynamic'

const DAILY_LIMIT = 30

/** BiDi fix: RLM в начало строк которые начинаются с не-ивритского символа */
function fixBidi(text: string): string {
  const hasHebrew = /[\u0590-\u05FF]/.test(text)
  if (!hasHebrew) return text
  const RLM = '\u200F'
  return text
    .split('\n')
    .map(line => {
      const first = line.match(/[A-Za-zА-Яа-яёЁ\u0590-\u05FF\u0600-\u06FF]/)
      if (!first) return line
      const isRtl = first[0].codePointAt(0)! >= 0x0590
      return isRtl ? line : RLM + line
    })
    .join('\n')
}

// ── GET — статус лимита ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()

  const { count } = await supabase
    .from('wa_broadcast_log')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'sent')
    .gte('sent_at', since)

  const used      = count ?? 0
  const remaining = Math.max(0, DAILY_LIMIT - used)

  return NextResponse.json({ used, remaining, limit: DAILY_LIMIT })
}

// ── POST — отправить рассылку ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let body: { message: string; clients: { id?: string; phone: string; name: string }[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, clients } = body
  if (!message?.trim())           return NextResponse.json({ error: 'message required' },  { status: 400 })
  if (!clients?.length)           return NextResponse.json({ error: 'clients required' },  { status: 400 })
  if (clients.length > DAILY_LIMIT) return NextResponse.json({ error: 'too_many_clients' }, { status: 400 })

  const supabase = createSupabaseServiceClient()
  const since    = new Date(Date.now() - 24 * 3600_000).toISOString()

  // Проверяем лимит
  const { count: usedCount } = await supabase
    .from('wa_broadcast_log')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'sent')
    .gte('sent_at', since)

  const used      = usedCount ?? 0
  const remaining = DAILY_LIMIT - used

  if (remaining <= 0) {
    return NextResponse.json({ error: 'limit_exceeded', used, limit: DAILY_LIMIT }, { status: 429 })
  }

  // Обрезаем список до remaining
  const toSend  = clients.slice(0, remaining)
  const skipped = clients.length - toSend.length

  const fixedMessage = fixBidi(message.trim())

  const results = { sent: 0, failed: 0, skipped }
  const logs: any[] = []

  for (const client of toSend) {
    const result = await sendWhatsAppMessage({
      orgId,
      to:       client.phone,
      message:  fixedMessage,
      softFail: true,
    })

    logs.push({
      org_id:    orgId,
      client_id: client.id ?? null,
      phone:     client.phone,
      message:   fixedMessage,
      status:    result.ok ? 'sent' : 'failed',
    })

    if (result.ok) results.sent++
    else           results.failed++
  }

  // Записываем лог одним батчем
  if (logs.length) {
    await supabase.from('wa_broadcast_log').insert(logs)
  }

  return NextResponse.json({
    ok: true,
    results,
    remaining: Math.max(0, remaining - results.sent),
  })
}
