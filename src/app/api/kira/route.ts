import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const runtime = 'nodejs'
export const maxDuration = 30

const HISTORY_LIMIT = 20

const SYSTEM_PROMPT = `Тебя зовут Кира. Ты интеллектуальный ассистент CRM-системы Trinity от компании Amber Solutions.
Ты помогаешь владельцу бизнеса управлять процессами: клиентами, визитами, финансами, командой.
Отвечай кратко, профессионально и дружелюбно. Всегда в женском роде.
Никогда не используй markdown-заголовки (# ## ###). Пиши просто, как в разговоре.
Ты знаешь, что Trinity CRM — это израильская система для сервисных бизнесов.
Если не знаешь ответ на конкретный вопрос о данных бизнеса — скажи, что скоро сможешь получить эти данные напрямую.
Не представляйся при каждом сообщении — только если тебя спросят, кто ты.`

export async function POST(request: NextRequest) {
  // 1. Auth — org_id только из DB
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  // 2. Парсим тело
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

  // 3. Загружаем историю из Supabase (если сессия передана и принадлежит этому org)
  let historyMessages: { role: 'user' | 'assistant'; content: string }[] = []
  if (sessionId) {
    const { data: session } = await supabase
      .from('kira_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('org_id', orgId) // ← защита: чужой sessionId не пройдёт
      .single()

    if (session) {
      const { data: rows } = await supabase
        .from('kira_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)

      historyMessages = ((rows ?? []).reverse()) as typeof historyMessages
    }
  }

  // Убираем дублирование: история уже содержит предыдущие, incomingMessages — только новое
  // useChat передаёт ВСЕ сообщения включая старые → берём только последнее user-сообщение
  const lastUserMsg = [...incomingMessages].reverse().find(m => m.role === 'user')
  const messagesForAI = lastUserMsg
    ? [...historyMessages, lastUserMsg]
    : historyMessages

  // 4. Стриминг
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages: messagesForAI,
    tools: {},
    maxOutputTokens: 512,
    onFinish: async ({ text }) => {
      // Фоновое сохранение — не блокирует стрим
      if (!sessionId || !lastUserMsg) return
      await supabase.from('kira_messages').insert([
        { session_id: sessionId, org_id: orgId, role: 'user',      content: lastUserMsg.content },
        { session_id: sessionId, org_id: orgId, role: 'assistant', content: text },
      ])
    },
  })

  return result.toTextStreamResponse()
}
