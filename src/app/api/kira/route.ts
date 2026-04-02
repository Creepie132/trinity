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

const SYSTEM_PROMPT = [
  'Тебя зовут Кира. Ты интеллектуальный ассистент CRM-системы Trinity от компании Amber Solutions.',
  'Ты помогаешь владельцу бизнеса управлять процессами: клиентами, визитами, финансами, командой.',
  'Отвечай кратко, профессионально и дружелюбно. Всегда в женском роде.',
  'Никогда не используй markdown-заголовки (# ## ###). Пиши просто, как в разговоре.',
  'Ты знаешь, что Trinity CRM — это израильская система для сервисных бизнесов.',
  'Если пользователь спрашивает о клиенте, выручке или долгах — используй инструменты. Никогда не выдумывай цифры.',
  'Не представляйся при каждом сообщении — только если спросят, кто ты.',
].join('\n')

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let incomingMessages: { role: 'user' | 'assistant'; content: string }[]
  let sessionId: string | null
  try {
    const body = await request.json()
    incomingMessages = body.messages
    sessionId = body.sessionId ?? null
    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  let historyMessages: { role: 'user' | 'assistant'; content: string }[] = []
  if (sessionId) {
    const { data: session } = await supabase
      .from('kira_sessions').select('id')
      .eq('id', sessionId).eq('org_id', orgId).single()
    if (session) {
      const { data: rows } = await supabase
        .from('kira_messages').select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }).limit(HISTORY_LIMIT)
      historyMessages = ((rows ?? []).reverse()) as typeof historyMessages
    }
  }

  const lastUserMsg = [...incomingMessages].reverse().find(m => m.role === 'user')
  const messagesForAI = lastUserMsg ? [...historyMessages, lastUserMsg] : historyMessages

  // ── Tool: getClientSummary ───────────────────────────────────────────────
  const getClientSummary = {
    description: 'Find client by name or phone. Returns contacts and lifetime value (LTV).',
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
          name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
          phone: c.phone ?? '—', email: c.email ?? '—',
          loyalty_points: c.loyalty_balance ?? 0,
          ltv_ils: Math.round((ltv[c.id] ?? 0) * 100) / 100,
          notes: c.notes ?? '',
        })),
      }
    },
  }


  // ── Tool: getRevenueStats ────────────────────────────────────────────────
  const getRevenueStats = {
    description: 'Get revenue stats (total, count, avg check) for today / week / month.',
    inputSchema: zodSchema(z.object({
      period: z.enum(['today', 'week', 'month']),
    })),
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
      const label = period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month'
      return {
        period: label,
        revenue_ils: Math.round(total * 100) / 100,
        payments_count: count,
        average_check_ils: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      }
    },
  }


  // ── Tool: getDebts (Generative UI) ───────────────────────────────────────
  const getDebts = {
    description: 'Get list of clients with outstanding debts (unpaid/partial sales). Used to render DebtWidget in UI.',
    inputSchema: zodSchema(z.object({
      limit: z.number().optional().describe('Max records, default 10'),
    })),
    execute: async ({ limit = 10 }: { limit?: number }) => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, total_amount, paid_amount, clients(id, first_name, last_name, phone)')
        .eq('org_id', orgId)
        .in('status', ['unpaid', 'partial'])
        .order('total_amount', { ascending: false })
        .limit(limit)
      if (error || !data?.length) return { found: false, debts: [] }
      return {
        found: true,
        debts: (data as any[]).map(s => {
          const client = s.clients
          const debt = Math.round((Number(s.total_amount) - Number(s.paid_amount ?? 0)) * 100) / 100
          return {
            id:     s.id,
            name:   `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || 'Unknown',
            phone:  client?.phone ?? '',
            amount: debt,
          }
        }),
      }
    },
  }

  // ── Stream ───────────────────────────────────────────────────────────────
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages: messagesForAI,
    tools: { getClientSummary, getRevenueStats, getDebts },
    stopWhen: stepCountIs(3),
    maxOutputTokens: 1024,
    onFinish: async ({ text }) => {
      if (!sessionId || !lastUserMsg || !text) return
      await supabase.from('kira_messages').insert([
        { session_id: sessionId, org_id: orgId, role: 'user',      content: lastUserMsg.content },
        { session_id: sessionId, org_id: orgId, role: 'assistant', content: text },
      ])
    },
  })

  return result.toUIMessageStreamResponse()
}
