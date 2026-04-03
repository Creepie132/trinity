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

// ── Модули Trinity и к каким инструментам они дают доступ ────────────────
const MODULE_TOOL_MAP: Record<string, string[]> = {
  visits:   ['createVisitByName', 'cancelVisit', 'rescheduleVisit', 'getSchedule'],
  clients:  ['getClientSummary'],
  payments: ['getRevenueStats'],
  sales:    ['getDebts'],
}

// Список всех инструментов с читаемым описанием для промпта
const ALL_TOOL_DESCRIPTIONS: Record<string, string> = {
  getClientSummary:   'поиск клиента',
  createVisitByName:  'создать запись/визит',
  cancelVisit:        'отменить визит',
  rescheduleVisit:    'перенести визит',
  getSchedule:        'расписание на день',
  getRevenueStats:    'статистика выручки',
  getDebts:           'должники',
}

// ── Построение системного промпта с учётом модулей и контекста ───────────
function buildSystemPrompt(ctx: {
  orgName: string
  userName: string
  today: string
  enabledTools: string[]
  disabledModules: string[]
}): string {
  const { orgName, userName, today, enabledTools, disabledModules } = ctx

  const toolList = enabledTools
    .map(t => `- ${ALL_TOOL_DESCRIPTIONS[t] ?? t}`)
    .join('\n')

  const disabledSection = disabledModules.length > 0
    ? [
        '',
        '═══ ЗАБЛОКИРОВАННЫЕ МОДУЛИ ═══',
        'Следующие модули ОТКЛЮЧЕНЫ у этой организации. Если пользователь',
        'просит что-то связанное с ними — вежливо объясни, что модуль не подключён,',
        'и предложи обратиться к администратору. НЕ пытайся выполнить действие.',
        '',
        disabledModules.map(m => `- ${m}`).join('\n'),
      ].join('\n')
    : ''

  return [
    `Тебя зовут Кира. Ты личный ИИ-ассистент в CRM Trinity от Amber Solutions.`,
    `Ты работаешь с организацией: ${orgName}`,
    `Сегодня: ${today} (часовой пояс Израиль, Asia/Jerusalem, UTC+3).`,
    `Ты общаешься с пользователем: ${userName}`,
    '',
    'ХАРАКТЕР: Живая, тёплая, немного с юмором. Говоришь как умный коллега рядом. Короткие ответы.',
    '',
    '═══ МОДЕЛЬ ДАННЫХ — что существует в Trinity ═══',
    '',
    'Клиент: имя, телефон, email, заметки, баланс лояльности.',
    'Визит/запись: дата+время, статус (scheduled/confirmed/completed/cancelled/no_show),',
    '  услуга, мастер, цена, длительность.',
    'Оплата: сумма, метод (cash/card/transfer/tranzila), статус (completed/pending/refunded).',
    'Продажа: товары/услуги в одном чеке, статус (paid/unpaid/partial).',
    'Задача: текст, срок, статус (open/done), исполнитель.',
    'Расходы: сумма, категория, дата.',
    '',
    '═══ ЧТО КИРА НЕ УМЕЕТ (не обещай и не пытайся) ═══',
    '',
    '- Создать нового клиента',
    '- Удалить что-либо из системы',
    '- Редактировать существующую оплату',
    '- Управлять настройками, тарифами, интеграциями',
    '- Видеть данные других организаций',
    '- Выполнять действия за пределами перечисленных инструментов',
    '',
    '═══ ДОСТУПНЫЕ ИНСТРУМЕНТЫ (только эти, не выдумывай других) ═══',
    '',
    toolList || '- нет доступных инструментов',
    disabledSection,
    '',
    '═══ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА (нарушать запрещено) ═══',
    '',
    '1. НИКОГДА не сообщай что действие выполнено, пока инструмент не вернул success:true.',
    '   Если инструмент вернул ошибку — скажи об этом честно. НЕЛЬЗЯ врать про успех.',
    '   НЕЛЬЗЯ вызывать один и тот же инструмент дважды для одного запроса.',
    '   Если инструмент вернул success:true или duplicate_prevented:true — это финал, больше не вызывай.',
    '',
    '2. Типы событий:',
    '   "встреча" / "встречу" / "meeting" → event_type="meeting", service="Встреча"',
    '   "визит" / "запись" / "приём" / "тур" → event_type="visit", service="Визит"',
    '   Для создания ВСЕГДА используй createVisitByName с правильным event_type.',
    '   НЕ СПРАШИВАЙ про услугу и цену если не просят — дефолты достаточны.',
    '',
    '3. Порядок для создания записи/встречи:',
    '   а) Получил имя клиента и дату/время? → сразу вызывай createVisitByName.',
    '   б) Не знаешь дату/время? → спроси ТОЛЬКО это, одним вопросом.',
    '   в) НЕ спрашивай про услугу и цену — дефолты достаточны.',
    '',
    '4. После успешного выполнения действия — пиши коротко: что сделано, для кого, когда.',
    '   Например: "Готово! Запись для Анеты на сегодня в 12:00 ✅"',
    '',
    '5. НИКОГДА не используй markdown-заголовки (# ## ###). Только текст.',
    '',
    '6. МОДУЛЬНЫЙ ЗАПРЕТ: если пользователь просит что-то из заблокированных модулей —',
    '   скажи коротко: "Этот модуль не подключён в вашей организации. Обратитесь к администратору."',
    '   НЕ пытайся обойти ограничение, НЕ вызывай инструменты для недоступных модулей.',
  ].join('\n')
}


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

  // ── Загружаем контекст организации ──────────────────────────────────────
  const { data: org } = await supabase
    .from('organizations')
    .select('name, features, subscription_status')
    .eq('id', orgId)
    .single()

  const { data: userProfile } = await supabase
    .from('org_users')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  const orgName   = org?.name ?? 'Организация'
  const rawName   = userProfile
    ? `${userProfile.first_name ?? ''} ${userProfile.last_name ?? ''}`.trim()
    : ''
  const userName  = rawName || (user.email?.split('@')[0] ?? 'Пользователь')
  const today     = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Jerusalem', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // ── Определяем активные модули и доступные инструменты ──────────────────
  const features  = (org?.features as any) ?? {}
  const modules   = features.modules ?? {}
  const status    = org?.subscription_status ?? 'active'
  const isDemo    = features.is_demo === true || features.is_trial === true
  const isActive  = ['active', 'manual', 'demo', 'trial'].includes(status)

  // Собираем enabled модули (логика идентична useFeatures на клиенте)
  const enabledModules: Record<string, boolean> = {
    clients:  modules.clients  ?? true,
    visits:   modules.visits   ?? true,
    sales:    modules.sales    ?? isDemo,
    payments: modules.payments ?? isDemo,
  }

  // Если орг неактивна — блокируем всё кроме чтения
  if (!isActive) {
    enabledModules.visits   = false
    enabledModules.sales    = false
    enabledModules.payments = false
  }

  // Строим список доступных инструментов
  const enabledTools: string[] = []
  const disabledModuleNames: string[] = []

  const MODULE_LABELS: Record<string, string> = {
    clients:  'Клиенты',
    visits:   'Визиты и записи',
    payments: 'Оплаты и выручка',
    sales:    'Продажи и должники',
  }

  for (const [mod, tools] of Object.entries(MODULE_TOOL_MAP)) {
    if (enabledModules[mod]) {
      enabledTools.push(...tools)
    } else {
      disabledModuleNames.push(MODULE_LABELS[mod] ?? mod)
    }
  }

  const systemPrompt = buildSystemPrompt({ orgName, userName, today, enabledTools, disabledModules: disabledModuleNames })

  // ── История сессии ───────────────────────────────────────────────────────
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
      if (dbHistory.length > 0) messagesForAI = [...dbHistory, ...incomingNormalized]
    }
  }

  const lastUserText = [...incomingNormalized].reverse().find(m => m.role === 'user')?.content ?? null

  // ── TOOLS ─────────────────────────────────────────────────────────────────

  // 1. Найти клиента
  const getClientSummary = {
    description: 'Find client by name or phone. Returns id, contacts, LTV.',
    inputSchema: zodSchema(z.object({ query: z.string() })),
    execute: async ({ query }: { query: string }) => {
      const term = `%${query.replace(/[%_\\]/g, '\\$&')}%`
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, notes, loyalty_balance')
        .eq('org_id', orgId)
        .or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term}`)
        .limit(5)
      if (!data?.length) return { found: false, message: 'Client not found' }
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
          phone: c.phone ?? '—', email: c.email ?? '—',
          loyalty_points: c.loyalty_balance ?? 0,
          ltv_ils: Math.round((ltv[c.id] ?? 0) * 100) / 100,
          notes: c.notes ?? '',
        })),
      }
    },
  }

  // 2. Создать запись по ИМЕНИ клиента
  const createVisitByName = {
    description: [
      'Create a visit/appointment by CLIENT NAME (not UUID).',
      'Use this for ALL booking requests: "запись", "встреча", "визит", "приём".',
      'Automatically finds the client, then creates the visit.',
      'event_type: use "meeting" when user says "встреча"/"встречу"/"meeting", otherwise "visit".',
      'service defaults to "Встреча" for meetings or "Визит" for visits if not specified. price defaults to 0.',
    ].join(' '),
    inputSchema: zodSchema(z.object({
      client_name: z.string().describe('Client first name or full name'),
      date: z.string().describe('Date YYYY-MM-DD'),
      time: z.string().describe('Time HH:MM (24h)'),
      event_type: z.enum(['visit', 'meeting']).optional().describe('"meeting" if user said встреча/meeting, "visit" otherwise. Default: visit'),
      service: z.string().optional().describe('Service name, defaults to "Встреча" for meetings, "Визит" for visits'),
      duration_minutes: z.number().optional().describe('Duration minutes, default 60'),
      price: z.number().optional().describe('Price ILS, default 0'),
      notes: z.string().optional(),
    })),
    execute: async ({ client_name, date, time, event_type = 'visit', service, duration_minutes = 60, price = 0, notes }: {
      client_name: string; date: string; time: string; event_type?: 'visit' | 'meeting'; service?: string
      duration_minutes?: number; price?: number; notes?: string
    }) => {
      const resolvedService = service ?? (event_type === 'meeting' ? 'Встреча' : 'Визит')
      const term = `%${client_name.replace(/[%_\\]/g, '\\$&')}%`
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('org_id', orgId)
        .or(`first_name.ilike.${term},last_name.ilike.${term}`)
        .limit(3)
      if (!clients?.length) {
        return { success: false, error: `Клиент "${client_name}" не найден в базе. Проверь имя.` }
      }
      if (clients.length > 1) {
        return {
          success: false, ambiguous: true,
          error: `Найдено несколько клиентов с таким именем`,
          clients: clients.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name ?? ''}`.trim() })),
        }
      }
      const client = clients[0]
      const scheduled_at = new Date(`${date}T${time}:00+03:00`).toISOString()

      // Идемпотентность: проверяем нет ли уже такого визита (защита от двойного вызова GPT)
      const windowStart = new Date(new Date(scheduled_at).getTime() - 60_000).toISOString() // -1 мин
      const windowEnd   = new Date(new Date(scheduled_at).getTime() + 60_000).toISOString() // +1 мин
      const { data: existing } = await supabase
        .from('visits')
        .select('id, scheduled_at, service_type, status')
        .eq('org_id', orgId)
        .eq('client_id', client.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', windowStart)
        .lte('scheduled_at', windowEnd)
        .limit(1)
        .maybeSingle()

      if (existing) {
        return {
          success: true,
          visit_id: existing.id,
          client_name: `${client.first_name} ${client.last_name ?? ''}`.trim(),
          scheduled_at: existing.scheduled_at,
          service: existing.service_type,
          status: existing.status,
          duplicate_prevented: true,
        }
      }

      const { data: visit, error } = await supabase
        .from('visits')
        .insert({
          client_id: client.id, org_id: orgId, scheduled_at,
          duration_minutes, price, quantity: 1, notes: notes ?? null,
          status: 'scheduled', staff_user_id: user.id,
          event_type, service_type: resolvedService, service_id: null,
        })
        .select('id, scheduled_at, service_type, status')
        .single()
      if (error) return { success: false, error: error.message }
      return {
        success: true, visit_id: visit.id,
        client_name: `${client.first_name} ${client.last_name ?? ''}`.trim(),
        scheduled_at: visit.scheduled_at, service: visit.service_type, status: visit.status,
      }
    },
  }

  // 3. Статистика выручки
  const getRevenueStats = {
    description: 'Revenue stats for today / week / month.',
    inputSchema: zodSchema(z.object({ period: z.enum(['today', 'week', 'month']) })),
    execute: async ({ period }: { period: 'today' | 'week' | 'month' }) => {
      const now = new Date()
      let from: Date
      if (period === 'today') from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      else if (period === 'week') { const d = now.getDay() === 0 ? 6 : now.getDay() - 1; from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d) }
      else from = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data, error } = await supabase.from('payments').select('amount')
        .eq('org_id', orgId).eq('status', 'completed')
        .gte('paid_at', from.toISOString()).lte('paid_at', now.toISOString())
      if (error) return { error: 'Could not fetch data' }
      const total = (data ?? []).reduce((s, p) => s + Number(p.amount), 0)
      const count = data?.length ?? 0
      return { period, revenue_ils: Math.round(total * 100) / 100, payments_count: count, average_check_ils: count > 0 ? Math.round((total / count) * 100) / 100 : 0 }
    },
  }

  // 4. Должники
  const getDebts = {
    description: 'Clients with outstanding debts.',
    inputSchema: zodSchema(z.object({ limit: z.number().optional() })),
    execute: async ({ limit = 10 }: { limit?: number }) => {
      const { data, error } = await supabase.from('sales')
        .select('id, total_amount, paid_amount, clients(id, first_name, last_name, phone)')
        .eq('org_id', orgId).in('status', ['unpaid', 'partial'])
        .order('total_amount', { ascending: false }).limit(limit)
      if (error || !data?.length) return { found: false, debts: [] }
      return { found: true, debts: (data as any[]).map(s => { const c = s.clients; const debt = Math.round((Number(s.total_amount) - Number(s.paid_amount ?? 0)) * 100) / 100; return { id: s.id, name: `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Unknown', phone: c?.phone ?? '', amount: debt } }) }
    },
  }

  // 5. Расписание на дату
  const getSchedule = {
    description: 'Get visits for a specific date. date = YYYY-MM-DD, "today", or "tomorrow".',
    inputSchema: zodSchema(z.object({ date: z.string() })),
    execute: async ({ date }: { date: string }) => {
      const tz = 'Asia/Jerusalem'
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
      let targetDate = date === 'today' ? now : date === 'tomorrow' ? (()=>{ const d = new Date(now); d.setDate(d.getDate()+1); return d })() : new Date(date)
      const dayStart = new Date(targetDate); dayStart.setHours(0,0,0,0)
      const dayEnd   = new Date(targetDate); dayEnd.setHours(23,59,59,999)
      const { data, error } = await supabase.from('visits')
        .select('id, scheduled_at, duration_minutes, status, notes, service_type, clients(first_name, last_name, phone)')
        .eq('org_id', orgId).in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString())
        .order('scheduled_at', { ascending: true }).limit(30)
      if (error) return { error: 'Failed to load schedule' }
      if (!data?.length) return { found: false, date, visits: [] }
      return { found: true, date: targetDate.toLocaleDateString('he-IL'), visits: (data as any[]).map(v => ({ id: v.id, time: new Date(v.scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: tz }), client: `${v.clients?.first_name??''} ${v.clients?.last_name??''}`.trim()||'Unknown', phone: v.clients?.phone??'', service: v.service_type??'—', notes: v.notes??'' })) }
    },
  }

  // 6. Отменить визит
  const cancelVisit = {
    description: 'Cancel an existing visit by visit_id.',
    inputSchema: zodSchema(z.object({ visit_id: z.string(), reason: z.string().optional() })),
    execute: async ({ visit_id, reason }: { visit_id: string; reason?: string }) => {
      const { data: existing } = await supabase.from('visits')
        .select('id, status, scheduled_at, clients(first_name, last_name)')
        .eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Visit not found or access denied' }
      const { error } = await supabase.from('visits')
        .update({ status: 'cancelled', notes: reason ? `Cancelled by Kira: ${reason}` : 'Cancelled by Kira' })
        .eq('id', visit_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      const c = (existing as any).clients
      return { success: true, cancelled_visit_id: visit_id, client: c ? `${c.first_name??''} ${c.last_name??''}`.trim() : 'Unknown', was_scheduled_at: existing.scheduled_at }
    },
  }

  // 7. Перенести визит
  const rescheduleVisit = {
    description: 'Reschedule a visit to a new date/time.',
    inputSchema: zodSchema(z.object({ visit_id: z.string(), new_date: z.string(), new_time: z.string() })),
    execute: async ({ visit_id, new_date, new_time }: { visit_id: string; new_date: string; new_time: string }) => {
      const { data: existing } = await supabase.from('visits').select('id').eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Visit not found or access denied' }
      const new_scheduled_at = new Date(`${new_date}T${new_time}:00+03:00`).toISOString()
      const { error } = await supabase.from('visits').update({ scheduled_at: new_scheduled_at, updated_at: new Date().toISOString() }).eq('id', visit_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      return { success: true, visit_id, new_scheduled_at }
    },
  }

  // ── Фильтруем инструменты по активным модулям ────────────────────────────
  const ALL_TOOLS = {
    getClientSummary,
    createVisitByName,
    cancelVisit,
    rescheduleVisit,
    getSchedule,
    getRevenueStats,
    getDebts,
  }

  const activeTools = Object.fromEntries(
    Object.entries(ALL_TOOLS).filter(([name]) => enabledTools.includes(name))
  )

  // ── Stream ───────────────────────────────────────────────────────────────
  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: messagesForAI,
    tools: activeTools,
    stopWhen: stepCountIs(5),
    maxOutputTokens: 1024,
    temperature: 0.4,
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
