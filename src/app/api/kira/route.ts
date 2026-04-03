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
  visits:   ['createVisitByName', 'cancelVisit', 'rescheduleVisit', 'updateVisitType',
             'getSchedule', 'startVisit', 'completeVisit', 'updateVisit', 'openVisitUI'],
  clients:  ['getClientSummary', 'getTopClients', 'createClient', 'updateClient', 'deleteClient', 'getClientHistory', 'openClientUI'],
  payments: ['getRevenueStats', 'getClientPayments'],
  sales:    ['getDebts'],
}

// Список всех инструментов с читаемым описанием для промпта
const ALL_TOOL_DESCRIPTIONS: Record<string, string> = {
  getClientSummary:   'поиск клиента по имени/телефону',
  getTopClients:      'топ клиентов по выручке (LTV)',
  createClient:       'создать нового клиента (задаёт уточняющие вопросы)',
  updateClient:       'редактировать данные клиента',
  deleteClient:       'удалить клиента (требует PIN-подтверждения)',
  getClientHistory:   'история визитов клиента',
  getClientPayments:  'история платежей клиента',
  openClientUI:       'открыть карточку клиента, галерею, документы, WhatsApp, продажу, звонок, SMS, навигатор',
  createVisitByName:  'создать запись/визит/встречу с уточняющими вопросами',
  cancelVisit:        'отменить визит',
  rescheduleVisit:    'перенести визит на другое время',
  updateVisitType:    'изменить тип записи (встреча ↔ визит)',
  updateVisit:        'редактировать поля визита (время, услуга, цена, заметки)',
  getSchedule:        'расписание на день',
  startVisit:         'начать визит (перевести в in_progress)',
  completeVisit:      'завершить визит (перевести в completed)',
  openVisitUI:        'открыть WhatsApp/звонок/SMS для клиента из визита',
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
  language: 'he' | 'ru'
}): string {
  const { orgName, userName, today, enabledTools, disabledModules, language } = ctx

  const langInstruction = language === 'he'
    ? 'שפת התקשורת: עברית. תמיד תענה בעברית בלבד, ללא יוצא מן הכלל. גם אם המשתמש כותב ברוסית — תענה בעברית.'
    : 'Язык общения: русский. Всегда отвечай только на русском, без исключений. Даже если пользователь пишет на иврите — отвечай на русском.'

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
    `═══ ЯЗЫК ОБЩЕНИЯ (АБСОЛЮТНЫЙ ПРИОРИТЕТ) ═══`,
    langInstruction,
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
    '   Если пользователь говорит "ой ошибся", "измени на встречу/визит" →',
    '   используй updateVisitType. ВАЖНО: если в предыдущем ответе был создан визит',
    '   и известен visit_id — передай его явно в visit_id. Если имя клиента известно',
    '   из контекста — передай в client_name. Никогда не вызывай без хотя бы одного из них.',
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
    '',
    '7. СОЗДАНИЕ КЛИЕНТА: если пользователь хочет добавить клиента — спроси по порядку:',
    '   а) Имя и фамилия (обязательно)',
    '   б) Телефон (обязательно)',
    '   Как только есть имя + телефон — СРАЗУ вызывай createClient, не жди остального.',
    '   Email, дата рождения, адрес, заметки — необязательны. НЕ спрашивай про них.',
    '   Если пользователь сам говорит "не знаю" / "нет" / "пропусти" / "неважно" —',
    '   передавай null для этого поля и продолжай. Никогда не зависай на необязательных полях.',
    '   ЗАПРЕЩЕНО: сообщать об ошибках с необязательными полями (дата рождения, email и т.д.).',
    '   Если поле не заполнено — просто передай null и создай клиента молча.',
    '   НИКОГДА не предлагай "попробовать ещё раз" из-за необязательного поля.',
    '',
    '8. УДАЛЕНИЕ КЛИЕНТА: ВСЕГДА требуй PIN перед удалением.',
    '   Шаг 1: найди клиента через getClientSummary, подтверди имя.',
    '   Шаг 2: скажи "Для удаления введи свой PIN-код".',
    '   Шаг 3: вызови deleteClient с pin который ввёл пользователь.',
    '   Никогда не удаляй без явного PIN от пользователя.',
    '',
    '9. UI-ДЕЙСТВИЯ через openClientUI: когда пользователь просит открыть карточку клиента,',
    '   галерею, документы, WhatsApp, новую продажу, навигатор, позвонить или написать SMS —',
    '   сначала найди клиента через getClientSummary (чтобы получить client_id),',
    '   затем вызови openClientUI с нужным action.',
    '   Для звонка и SMS — сначала сообщи номер и спроси подтверждение.',
    '',
    '10. ВИЗИТЫ и ВСТРЕЧИ — различай типы:',
    '    "встреча" / "встречу" / "деловая встреча" → event_type="meeting"',
    '    "визит" / "запись" / "приём" / "клиент придёт" → event_type="visit"',
    '    При создании спрашивай по порядку: имя клиента → дата и время.',
    '    Цену, услугу, заметки — только если пользователь сам упоминает.',
    '',
    '11. НАЧАТЬ/ЗАВЕРШИТЬ ВИЗИТ:',
    '    Сначала найди визит через getSchedule или по контексту разговора.',
    '    "начать визит" / "клиент пришёл" → startVisit(visit_id)',
    '    "завершить визит" / "клиент ушёл" / "закрыть визит" → completeVisit(visit_id)',
    '',
    '12. РЕДАКТИРОВАТЬ ВИЗИТ: найди визит через getSchedule → спроси что менять →',
    '    вызови updateVisit только с изменёнными полями.',
    '',
    '13. ОТМЕНА: cancelVisit требует только visit_id. Уточни клиента если неясно из контекста.',
    '',
    '14. ЗВОНОК/SMS/WhatsApp из визита → openVisitUI. Не нужно искать клиента отдельно,',
    '    если visit_id и phone уже известны из getSchedule.',
  ].join('\n')
}


export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId, user } = auth

  let rawMessages: RawMsg[]
  let sessionId: string | null
  let language: 'he' | 'ru'
  try {
    const body = await request.json()
    rawMessages = body.messages ?? []
    sessionId = body.sessionId ?? null
    language = (body.language === 'he' || body.language === 'ru') ? body.language : 'ru'
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

  const systemPrompt = buildSystemPrompt({ orgName, userName, today, enabledTools, disabledModules: disabledModuleNames, language })

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

  // 8. Изменить тип записи (встреча ↔ визит) по имени клиента
  const updateVisitType = {
    description: [
      'Change event_type of the most recent scheduled visit for a client.',
      'Use when user says "измени на встречу", "измени на визит", "ой ошибся" etc.',
      'PRIORITY: if visit_id is known from previous assistant response — pass it directly.',
      'Otherwise finds the latest scheduled/confirmed visit for the client by name.',
    ].join(' '),
    inputSchema: zodSchema(z.object({
      client_name: z.string().optional().describe('Client first name or full name — use if visit_id unknown'),
      event_type: z.enum(['visit', 'meeting']).describe('"meeting" for встреча, "visit" for визит'),
      visit_id: z.string().optional().describe('Specific visit UUID if known from previous step — preferred over client_name'),
    })),
    execute: async ({ client_name, event_type, visit_id }: { client_name?: string; event_type: 'visit' | 'meeting'; visit_id?: string }) => {
      let targetVisitId = visit_id

      if (!targetVisitId) {
        if (!client_name) {
          // Последний созданный визит в этой орг за последние 10 минут
          const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
          const { data: recent } = await supabase
            .from('visits').select('id, scheduled_at, event_type, service_type')
            .eq('org_id', orgId)
            .in('status', ['scheduled', 'confirmed'])
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1)
          if (!recent?.length) return { success: false, error: 'Не удалось найти недавно созданную запись. Уточни имя клиента.' }
          targetVisitId = recent[0].id
        } else {
          const term = `%${client_name.replace(/[%_\\]/g, '\\$&')}%`
          const { data: clients } = await supabase
            .from('clients').select('id, first_name, last_name')
            .eq('org_id', orgId)
            .or(`first_name.ilike.${term},last_name.ilike.${term}`)
            .limit(3)
          if (!clients?.length) return { success: false, error: `Клиент "${client_name}" не найден` }
          if (clients.length > 1) return {
            success: false, ambiguous: true,
            clients: clients.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name ?? ''}`.trim() })),
          }
          const { data: visits } = await supabase
            .from('visits').select('id, scheduled_at, event_type, service_type')
            .eq('org_id', orgId).eq('client_id', clients[0].id)
            .in('status', ['scheduled', 'confirmed'])
            .order('scheduled_at', { ascending: false })
            .limit(1)
          if (!visits?.length) return { success: false, error: `Нет активных записей для клиента "${client_name}"` }
          targetVisitId = visits[0].id
        }
      }

      const newService = event_type === 'meeting' ? 'Встреча' : 'Визит'
      const { error } = await supabase.from('visits')
        .update({ event_type, service_type: newService, updated_at: new Date().toISOString() })
        .eq('id', targetVisitId).eq('org_id', orgId)

      if (error) return { success: false, error: error.message }
      return { success: true, visit_id: targetVisitId, event_type, service_type: newService }
    },
  }

  // 9. Топ клиентов по выручке (LTV)
  const getTopClients = {
    description: 'Get top clients by total revenue (LTV). Use for "кто принёс больше денег", "лучшие клиенты", "топ клиентов".',
    inputSchema: zodSchema(z.object({
      limit: z.number().optional().describe('How many top clients to return, default 5'),
      period: z.enum(['all', 'month', 'year']).optional().describe('Time period: all (default), month, year'),
    })),
    execute: async ({ limit = 5, period = 'all' }: { limit?: number; period?: 'all' | 'month' | 'year' }) => {
      const now = new Date()
      let dateFilter: string | null = null
      if (period === 'month') dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      if (period === 'year')  dateFilter = new Date(now.getFullYear(), 0, 1).toISOString()

      let query = supabase
        .from('payments')
        .select('client_id, amount')
        .eq('org_id', orgId)
        .eq('status', 'completed')
      if (dateFilter) query = query.gte('paid_at', dateFilter)

      const { data: payments, error } = await query
      if (error || !payments?.length) return { found: false, clients: [] }

      // Агрегируем LTV по client_id
      const ltv: Record<string, number> = {}
      for (const p of payments) {
        ltv[p.client_id] = (ltv[p.client_id] ?? 0) + Number(p.amount)
      }
      const topIds = Object.entries(ltv)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id)

      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .eq('org_id', orgId)
        .in('id', topIds)

      if (!clients?.length) return { found: false, clients: [] }

      const result = topIds
        .map(id => {
          const c = clients.find(cl => cl.id === id)
          if (!c) return null
          return {
            name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
            phone: c.phone ?? '—',
            ltv_ils: Math.round((ltv[id] ?? 0) * 100) / 100,
          }
        })
        .filter(Boolean)

      return { found: true, period, clients: result }
    },
  }

  // 10. Создать клиента
  const createClient = {
    description: 'Create a new client. first_name and phone are required. Ask for them if missing.',
    inputSchema: zodSchema(z.object({
      first_name: z.string().describe('First name (required)'),
      last_name: z.string().optional(),
      phone: z.string().describe('Phone number (required)'),
      email: z.string().optional(),
      date_of_birth: z.string().optional().describe('YYYY-MM-DD'),
      address: z.string().optional(),
      notes: z.string().optional(),
    })),
    execute: async (data: { first_name: string; last_name?: string; phone: string; email?: string; date_of_birth?: string; address?: string; notes?: string }) => {
      // Защита: если дата не в формате YYYY-MM-DD — молча сбрасываем в null
      let dob: string | null = null
      if (data.date_of_birth) {
        const parsed = new Date(data.date_of_birth)
        dob = isNaN(parsed.getTime()) ? null : data.date_of_birth
      }
      const { data: client, error } = await supabase.from('clients').insert([{
        org_id: orgId,
        first_name: data.first_name,
        last_name: data.last_name ?? null,
        phone: data.phone,
        email: data.email ?? null,
        date_of_birth: dob,
        address: data.address ?? null,
        notes: data.notes ?? null,
      }]).select('id, first_name, last_name, phone').single()
      if (error) return { success: false, error: error.message }
      return { success: true, client_id: client.id, name: `${client.first_name} ${client.last_name ?? ''}`.trim(), phone: client.phone }
    },
  }

  // 11. Редактировать клиента
  const updateClient = {
    description: 'Update client fields. Find client first via getClientSummary to get client_id.',
    inputSchema: zodSchema(z.object({
      client_id: z.string().describe('Client UUID from getClientSummary'),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      date_of_birth: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })),
    execute: async ({ client_id, ...fields }: { client_id: string; [k: string]: any }) => {
      const allowed = ['first_name','last_name','phone','email','date_of_birth','address','notes']
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const k of allowed) if (fields[k] !== undefined) updates[k] = fields[k] || null
      const { data, error } = await supabase.from('clients').update(updates).eq('id', client_id).eq('org_id', orgId).select('id, first_name, last_name').single()
      if (error) return { success: false, error: error.message }
      return { success: true, name: `${data.first_name} ${data.last_name ?? ''}`.trim() }
    },
  }

  // 12. Удалить клиента (с PIN)
  const deleteClient = {
    description: 'Delete a client. Requires PIN confirmation from the user. Ask for PIN before calling this tool.',
    inputSchema: zodSchema(z.object({
      client_id: z.string(),
      client_name: z.string().describe('Client name for confirmation message'),
      pin: z.string().describe('PIN entered by user'),
    })),
    execute: async ({ client_id, client_name, pin }: { client_id: string; client_name: string; pin: string }) => {
      // Verify PIN via Supabase Auth signInWithPassword
      const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(user.id)
      if (authErr || !authUser?.email) return { success: false, error: 'Не удалось проверить пользователя' }

      // Verify PIN by checking user metadata kira_pin
      const meta = authUser.user_metadata as any
      if (!meta?.kira_pin) return { success: false, error: 'PIN не установлен. Задай его в настройках профиля.' }
      if (meta.kira_pin !== pin) return { success: false, error: 'Неверный PIN. Удаление отменено.' }

      const { error } = await supabase.from('clients').delete().eq('id', client_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      return { success: true, deleted_name: client_name }
    },
  }

  // 13. История визитов клиента
  const getClientHistory = {
    description: 'Get visit history for a client. Find client_id first via getClientSummary.',
    inputSchema: zodSchema(z.object({
      client_id: z.string(),
      limit: z.number().optional(),
    })),
    execute: async ({ client_id, limit = 10 }: { client_id: string; limit?: number }) => {
      const { data, error } = await supabase.from('visits')
        .select('id, scheduled_at, status, service_type, event_type, price, notes')
        .eq('org_id', orgId).eq('client_id', client_id)
        .order('scheduled_at', { ascending: false }).limit(limit)
      if (error) return { found: false, visits: [] }
      return { found: !!data?.length, visits: (data ?? []).map(v => ({
        id: v.id,
        date: new Date(v.scheduled_at).toLocaleDateString('ru-RU', { timeZone: 'Asia/Jerusalem' }),
        time: new Date(v.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }),
        status: v.status, service: v.service_type ?? '—', type: v.event_type,
        price: v.price ? `₪${v.price}` : '—', notes: v.notes ?? '',
      })) }
    },
  }

  // 14. История платежей клиента
  const getClientPayments = {
    description: 'Get payment history for a client. Find client_id first via getClientSummary.',
    inputSchema: zodSchema(z.object({
      client_id: z.string(),
      limit: z.number().optional(),
    })),
    execute: async ({ client_id, limit = 10 }: { client_id: string; limit?: number }) => {
      const { data, error } = await supabase.from('payments')
        .select('id, amount, status, method, paid_at, notes')
        .eq('org_id', orgId).eq('client_id', client_id)
        .order('paid_at', { ascending: false }).limit(limit)
      if (error) return { found: false, payments: [] }
      const total = (data ?? []).filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0)
      return { found: !!data?.length, total_ils: Math.round(total * 100) / 100, payments: (data ?? []).map(p => ({
        amount: `₪${p.amount}`, status: p.status, method: p.method ?? '—',
        date: p.paid_at ? new Date(p.paid_at).toLocaleDateString('ru-RU', { timeZone: 'Asia/Jerusalem' }) : '—',
        notes: p.notes ?? '',
      })) }
    },
  }

  // 16. Начать визит
  const startVisit = {
    description: 'Start a visit — set status to in_progress. Use when user says "начать визит", "клиент пришёл", "начинаем".',
    inputSchema: zodSchema(z.object({
      visit_id: z.string().describe('Visit UUID — get from getSchedule if not known'),
      client_name: z.string().optional().describe('For confirmation message'),
    })),
    execute: async ({ visit_id, client_name }: { visit_id: string; client_name?: string }) => {
      const { data: existing } = await supabase.from('visits')
        .select('id, status, scheduled_at, service_type, event_type')
        .eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Визит не найден' }
      if (existing.status === 'in_progress') return { success: true, already: true, message: 'Визит уже начат' }
      if (existing.status === 'completed') return { success: false, error: 'Визит уже завершён' }
      const { error } = await supabase.from('visits')
        .update({ status: 'in_progress', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', visit_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      const label = existing.event_type === 'meeting' ? 'Встреча' : 'Визит'
      return { success: true, visit_id, label, client_name: client_name ?? '—', status: 'in_progress' }
    },
  }

  // 17. Завершить визит
  const completeVisit = {
    description: 'Complete a visit — set status to completed. Use when user says "завершить", "закрыть визит", "клиент ушёл".',
    inputSchema: zodSchema(z.object({
      visit_id: z.string(),
      client_name: z.string().optional(),
    })),
    execute: async ({ visit_id, client_name }: { visit_id: string; client_name?: string }) => {
      const { data: existing } = await supabase.from('visits')
        .select('id, status, event_type').eq('id', visit_id).eq('org_id', orgId).single()
      if (!existing) return { success: false, error: 'Визит не найден' }
      if (existing.status === 'completed') return { success: true, already: true, message: 'Визит уже завершён' }
      const { error } = await supabase.from('visits')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', visit_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      const label = existing.event_type === 'meeting' ? 'Встреча' : 'Визит'
      return { success: true, visit_id, label, client_name: client_name ?? '—', status: 'completed' }
    },
  }

  // 18. Редактировать визит
  const updateVisit = {
    description: 'Edit visit fields. Use after getSchedule to get visit_id. Only pass fields that need to change.',
    inputSchema: zodSchema(z.object({
      visit_id: z.string(),
      scheduled_at: z.string().optional().describe('ISO datetime with TZ, e.g. 2026-04-03T14:00:00+03:00'),
      service_type: z.string().optional().describe('Service name / label'),
      price: z.number().optional(),
      duration_minutes: z.number().optional(),
      notes: z.string().optional(),
    })),
    execute: async ({ visit_id, ...fields }: { visit_id: string; [k: string]: any }) => {
      const { data: cur } = await supabase.from('visits')
        .select('service_type, event_type').eq('id', visit_id).eq('org_id', orgId).single()
      if (!cur) return { success: false, error: 'Визит не найден' }
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      if (fields.scheduled_at    !== undefined) updates.scheduled_at    = fields.scheduled_at
      if (fields.service_type    !== undefined) updates.service_type    = fields.service_type
      if (fields.price           !== undefined) updates.price           = fields.price
      if (fields.duration_minutes !== undefined) updates.duration_minutes = fields.duration_minutes
      if (fields.notes           !== undefined) updates.notes           = fields.notes
      // service_type NOT NULL guard
      if (!updates.service_type) updates.service_type = cur.service_type ?? 'other'
      const { error } = await supabase.from('visits').update(updates).eq('id', visit_id).eq('org_id', orgId)
      if (error) return { success: false, error: error.message }
      return { success: true, visit_id, updated_fields: Object.keys(updates).filter(k => k !== 'updated_at') }
    },
  }

  // 19. UI-действия из визита: WhatsApp, звонок, SMS
  const openVisitUI = {
    description: 'Open WhatsApp, call, or SMS for client from a visit context. Use when user asks to contact a client during a visit.',
    inputSchema: zodSchema(z.object({
      client_id: z.string(),
      client_name: z.string(),
      action: z.enum(['open_whatsapp', 'call', 'sms']),
      phone: z.string().optional(),
      confirmed: z.boolean().optional().describe('true after user confirmed call/sms'),
    })),
    execute: async ({ client_id, client_name, action, phone, confirmed }: {
      client_id: string; client_name: string; action: string; phone?: string; confirmed?: boolean;
    }) => {
      if ((action === 'call' || action === 'sms') && !confirmed) {
        return {
          ui_action: null, needs_confirmation: true, action, phone, client_name,
          message: action === 'call'
            ? `Позвонить ${client_name} на ${phone ?? 'номер не указан'}? Подтверди.`
            : `Открыть SMS для ${client_name} (${phone ?? 'номер не указан'})? Подтверди.`,
        }
      }
      return { ui_action: action, client_id, client_name, phone }
    },
  }

  // 15. UI-действия: открыть карточку, галерею, WA, продажу, звонок, SMS, навигатор
  const openClientUI = {
    description: [
      'Trigger a UI action in the Trinity interface. Use for:',
      '"открой карточку/профиль" → action=open_client',
      '"галерея/фото" → action=open_gallery',
      '"документы" → action=open_documents',
      '"whatsapp/переписка" → action=open_whatsapp',
      '"новая продажа" → action=open_sale',
      '"навигатор/маршрут" → action=open_maps (requires address)',
      '"позвони/звонок" → action=call (requires phone, confirmed=true)',
      '"напиши SMS/сообщение" → action=sms (requires phone, confirmed=true)',
    ].join(' '),
    inputSchema: zodSchema(z.object({
      client_id: z.string().describe('Client UUID'),
      client_name: z.string().describe('Client name for display'),
      action: z.enum(['open_client','open_gallery','open_documents','open_whatsapp','open_sale','open_maps','call','sms']),
      phone: z.string().optional().describe('Required for call/sms'),
      address: z.string().optional().describe('Required for open_maps'),
      confirmed: z.boolean().optional().describe('true = user confirmed the action (for call/sms)'),
    })),
    execute: async ({ client_id, client_name, action, phone, address, confirmed }: {
      client_id: string; client_name: string; action: string;
      phone?: string; address?: string; confirmed?: boolean;
    }) => {
      // Защита: звонок и SMS только после явного подтверждения
      if ((action === 'call' || action === 'sms') && !confirmed) {
        return { ui_action: null, needs_confirmation: true, action, phone, client_name,
          message: action === 'call'
            ? `Позвонить ${client_name} на ${phone}? Подтверди.`
            : `Открыть SMS для ${client_name} (${phone})? Подтверди.` }
      }
      return { ui_action: action, client_id, client_name, phone, address }
    },
  }

  // ── Фильтруем инструменты по активным модулям ────────────────────────────
  const ALL_TOOLS = {
    getClientSummary,
    getTopClients,
    createClient,
    updateClient,
    deleteClient,
    getClientHistory,
    getClientPayments,
    openClientUI,
    createVisitByName,
    startVisit,
    completeVisit,
    updateVisit,
    openVisitUI,
    cancelVisit,
    rescheduleVisit,
    updateVisitType,
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
