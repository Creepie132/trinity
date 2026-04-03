import { streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { zodSchema } from 'ai'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const runtime = 'nodejs'
export const maxDuration = 60

const HISTORY_LIMIT = 20

type RawMsg = {
  role: 'user' | 'assistant'
  content?: string
  parts?: { type: string; text?: string }[]
}

function extractText(msg: RawMsg): string {
  if (msg.content) return msg.content
  if (msg.parts) {
    return msg.parts
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text!)
      .join('')
  }
  return ''
}


const SYSTEM_PROMPT = [
  'Тебя зовут Кира. Ты личный ИИ-ассистент в CRM Trinity от Amber Solutions.',
  '',
  'ХАРАКТЕР: Живая, тёплая, немного с юмором — как умный коллега рядом. Ты НЕ робот.',
  'Ты общаешься как человек: коротко, по делу, иногда добавляешь эмодзи. Без официоза.',
  'Если клиент расстроен — сочувствуешь. Если всё хорошо — радуешься вместе.',
  '',
  'ЧТО ТЫ УМЕЕШЬ ДЕЛАТЬ (это важно — ты реально делаешь, не советуешь):',
  '- Назначить визит клиенту: уточни имя/телефон, дату, время, услугу — и создай',
  '- Отменить визит: найди по имени или дате и отмени',
  '- Найти клиента и показать его историю',
  '- Показать статистику выручки',
  '- Показать должников',
  '- Показать расписание на сегодня/завтра/дату',
  '',
  'ПРАВИЛА ПОВЕДЕНИЯ:',
  '- НИКОГДА не говори "я не могу". Вместо этого — уточни что нужно и сделай.',
  '- Если не хватает данных — задай ОДИН уточняющий вопрос, не несколько сразу.',
  '- Подтверждай действие ДО выполнения, если это изменение данных (создание/отмена).',
  '- После выполнения — коротко подтверди что сделано. Без лишних слов.',
  '- Не используй markdown-заголовки (# ## ###). Просто текст.',
  '- Не представляйся при каждом сообщении — только если спросят.',
  '- Никогда не выдумывай цифры — используй инструменты.',
  '',
  'Текущая дата и время определяются по часовому поясу Израиля (Asia/Jerusalem).',
].join('\n')


export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId, user } = auth

  let rawMessages: RawMsg[]
  let sessionId: string | null
  try {
    const body = await request.json()
    rawMessages = body.messages ?? []
    sessionId = body.sessionId ?? null
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 })
  }

  const incomingNormalized = rawMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: extractText(m) }))
    .filter(m => m.content.length > 0)

  if (incomingNormalized.length === 0) {
    return new Response(JSON.stringify({ error: 'No messages with content' }), { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  let messagesForAI: { role: 'user' | 'assistant'; content: string }[] = incomingNormalized
  const isColdStart = incomingNormalized.length === 1 && incomingNormalized[0].role === 'user'

  if (isColdStart && sessionId) {
    const { data: session } = await supabase
      .from('kira_sessions').select('id')
      .eq('id', sessionId).eq('org_id', orgId).single()

    if (session) {
      const { data: rows } = await supabase
        .from('kira_messages').select('role, content')
        .eq('session_id', sessionId)
        .not('is_proactive', 'eq', true)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)

      const dbHistory = (rows ?? []).reverse() as { role: 'user' | 'assistant'; content: string }[]
      if (dbHistory.length > 0) {
        messagesForAI = [...dbHistory, ...incomingNormalized]
      }
    }
  }

  const lastUserText = [...incomingNormalized].reverse().find(m => m.role === 'user')?.content ?? null


  // ── TOOLS ────────────────────────────────────────────────────────────────

  // 1. Найти клиента
  const getClientSummary = {
    description: 'Find client by name or phone. Returns contacts and LTV.',
    inputSchema: zodSchema(z.object({
      query: z.string().describe('Client name or phone number'),
    })),
    execute: async ({ query }: { query: string }) => {
      const term = `%${query.replace(/[%_\\]/g, '\\$&')}%`
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, notes, loyalty_balance')
        .eq('org_id', orgId)
        .or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term}`)
        .limit(5)
      if (error || !data?.length) return { found: false, message: 'Client not found' }
      const clientIds = data.map(c => c.id)
      const { data: pmts } = await supabase
        .from('payments').select('client_id, amount')
        .eq('org_id', orgId).eq('status', 'completed').in('client_id', clientIds)
      const ltv: Record<string, number> = {}
      for (const p of pmts ?? []) ltv[p.client_id] = (ltv[p.client_id] ?? 0) + Number(p.amount)
      return {
        found: true,
        clients: data.map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
          phone: c.phone ?? '—',
          email: c.email ?? '—',
          loyalty_points: c.loyalty_balance ?? 0,
          ltv_ils: Math.round((ltv[c.id] ?? 0) * 100) / 100,
          notes: c.notes ?? '',
        })),
      }
    },
  }


  // 2. Статистика выручки
  const getRevenueStats = {
    description: 'Revenue stats (total, count, avg) for today / week / month.',
    inputSchema: zodSchema(z.object({ period: z.enum(['today', 'week', 'month']) })),
    execute: async ({ period }: { period: 'today' | 'week' | 'month' }) => {
      const now = new Date()
      let from: Date
      if (period === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (period === 'week') {
        const diff = now.getDay() === 0 ? 6 : now.getDay() - 1
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
      }
      const { data, error } = await supabase
        .from('payments').select('amount')
        .eq('org_id', orgId).eq('status', 'completed')
        .gte('paid_at', from.toISOString()).lte('paid_at', now.toISOString())
      if (error) return { error: 'Could not fetch data' }
      const total = (data ?? []).reduce((s, p) => s + Number(p.amount), 0)
      const count = data?.length ?? 0
      return {
        period,
        revenue_ils: Math.round(total * 100) / 100,
        payments_count: count,
        average_check_ils: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      }
    },
  }

  // 3. Должники
  const getDebts = {
    description: 'Clients with outstanding debts.',
    inputSchema: zodSchema(z.object({ limit: z.number().optional() })),
    execute: async ({ limit = 10 }: { limit?: number }) => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, total_amount, paid_amount, clients(id, first_name, last_name, phone)')
        .eq('org_id', orgId).in('status', ['unpaid', 'partial'])
        .order('total_amount', { ascending: false }).limit(limit)
      if (error || !data?.length) return { found: false, debts: [] }
      return {
        found: true,
        debts: (data as any[]).map(s => {
          const c = s.clients
          const debt = Math.round((Number(s.total_amount) - Number(s.paid_amount ?? 0)) * 100) / 100
          return { id: s.id, name: `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Unknown', phone: c?.phone ?? '', amount: debt }
        }),
      }
    },
  }


  // 4. Расписание (список визитов на дату)
  const getSchedule = {
    description: 'Get visits/appointments for a specific date or period.',
    inputSchema: zodSchema(z.object({
      date: z.string().describe('Date in YYYY-MM-DD format, or "today", "tomorrow"'),
    })),
    execute: async ({ date }: { date: string }) => {
      const tz = 'Asia/Jerusalem'
      let targetDate: Date
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
      if (date === 'today') {
        targetDate = now
      } else if (date === 'tomorrow') {
        targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + 1)
      } else {
        targetDate = new Date(date)
      }
      const dayStart = new Date(targetDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_at, duration_minutes, status, notes, service_type, clients(first_name, last_name, phone)')
        .eq('org_id', orgId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', dayStart.toISOString())
        .lte('scheduled_at', dayEnd.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(30)

      if (error) return { error: 'Failed to load schedule' }
      if (!data?.length) return { found: false, date: date, visits: [] }

      return {
        found: true,
        date: targetDate.toLocaleDateString('he-IL'),
        visits: (data as any[]).map(v => ({
          id: v.id,
          time: new Date(v.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: tz }),
          client: `${v.clients?.first_name ?? ''} ${v.clients?.last_name ?? ''}`.trim() || 'Unknown',
          phone: v.clients?.phone ?? '',
          service: v.service_type ?? '—',
          duration: v.duration_minutes ?? null,
          status: v.status,
          notes: v.notes ?? '',
        })),
      }
    },
  }


  // 5. Создать визит
  const createVisit = {
    description: 'Create a new visit/appointment for a client. Requires client_id, date (YYYY-MM-DD), time (HH:MM), service name.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().describe('Client UUID from getClientSummary'),
      date: z.string().describe('Date YYYY-MM-DD'),
      time: z.string().describe('Time HH:MM (24h, Israel timezone)'),
      service: z.string().describe('Service/procedure name'),
      duration_minutes: z.number().optional().describe('Duration in minutes, default 60'),
      price: z.number().optional().describe('Price in ILS, default 0'),
      notes: z.string().optional(),
    })),
    execute: async ({ client_id, date, time, service, duration_minutes = 60, price = 0, notes }: {
      client_id: string; date: string; time: string; service: string
      duration_minutes?: number; price?: number; notes?: string
    }) => {
      const scheduled_at = new Date(`${date}T${time}:00+03:00`).toISOString()
      const { data: visit, error } = await supabase
        .from('visits')
        .insert({
          client_id,
          org_id: orgId,
          scheduled_at,
          duration_minutes,
          price,
          quantity: 1,
          notes: notes ?? null,
          status: 'scheduled',
          staff_user_id: user.id,
          event_type: 'visit',
          service_type: service,
          service_id: null,
        })
        .select('id, scheduled_at, service_type, status')
        .single()
      if (error) return { success: false, error: error.message }
      return {
        success: true,
        visit_id: visit.id,
        scheduled_at: visit.scheduled_at,
        service: visit.service_type,
        status: visit.status,
      }
    },
  }


  // 6. Отменить визит
  const cancelVisit = {
    description: 'Cancel (delete) an existing visit by its ID.',
    inputSchema: zodSchema(z.object({
      visit_id: z.string().describe('Visit UUID from getSchedule or other tools'),
      reason: z.string().optional().describe('Cancellation reason (optional)'),
    })),
    execute: async ({ visit_id, reason }: { visit_id: string; reason?: string }) => {
      // Проверяем принадлежность визита org_id — безопасность
      const { data: existing } = await supabase
        .from('visits').select('id, status, scheduled_at, clients(first_name, last_name)')
        .eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Visit not found or access denied' }

      const { error } = await supabase
        .from('visits')
        .update({ status: 'cancelled', notes: reason ? `Cancelled by Kira: ${reason}` : 'Cancelled by Kira' })
        .eq('id', visit_id)
        .eq('org_id', orgId)

      if (error) return { success: false, error: error.message }
      const c = (existing as any).clients
      return {
        success: true,
        cancelled_visit_id: visit_id,
        client: c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : 'Unknown',
        was_scheduled_at: existing.scheduled_at,
      }
    },
  }

  // 7. Перенести визит
  const rescheduleVisit = {
    description: 'Reschedule an existing visit to a new date/time.',
    inputSchema: zodSchema(z.object({
      visit_id: z.string().describe('Visit UUID'),
      new_date: z.string().describe('New date YYYY-MM-DD'),
      new_time: z.string().describe('New time HH:MM'),
    })),
    execute: async ({ visit_id, new_date, new_time }: { visit_id: string; new_date: string; new_time: string }) => {
      const { data: existing } = await supabase
        .from('visits').select('id, org_id')
        .eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Visit not found or access denied' }

      const new_scheduled_at = new Date(`${new_date}T${new_time}:00+03:00`).toISOString()
      const { error } = await supabase
        .from('visits')
        .update({ scheduled_at: new_scheduled_at, updated_at: new Date().toISOString() })
        .eq('id', visit_id).eq('org_id', orgId)

      if (error) return { success: false, error: error.message }
      return { success: true, visit_id, new_scheduled_at }
    },
  }


  // ── Stream ───────────────────────────────────────────────────────────────
  const result = streamText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages: messagesForAI,
    tools: {
      getClientSummary,
      getRevenueStats,
      getDebts,
      getSchedule,
      createVisit,
      cancelVisit,
      rescheduleVisit,
    },
    stopWhen: stepCountIs(5),
    maxOutputTokens: 1024,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      if (!sessionId || !lastUserText || !text) return
      try {
        await supabase.from('kira_messages').insert([
          { session_id: sessionId, org_id: orgId, role: 'user',      content: lastUserText },
          { session_id: sessionId, org_id: orgId, role: 'assistant', content: text },
        ])
      } catch (dbError) {
        console.error('[kira] DB SAVE ERROR:', dbError)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
