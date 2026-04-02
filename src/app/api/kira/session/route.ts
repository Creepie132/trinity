import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const HISTORY_LIMIT = 20 // максимум сообщений в контексте

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()

  // Ищем последнюю сессию этого орга
  const { data: existingSession } = await supabase
    .from('kira_sessions')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let sessionId: string

  if (existingSession) {
    sessionId = existingSession.id
  } else {
    // Создаём новую сессию
    const { data: newSession, error } = await supabase
      .from('kira_sessions')
      .insert({ org_id: orgId })
      .select('id')
      .single()

    if (error || !newSession) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }
    sessionId = newSession.id
  }

  // Тянем последние HISTORY_LIMIT сообщений
  const { data: messages } = await supabase
    .from('kira_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  // Разворачиваем обратно в хронологический порядок
  const history = (messages ?? []).reverse()

  return NextResponse.json({ sessionId, messages: history })
}
