import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const HISTORY_LIMIT = 20 // максимум сообщений в контексте

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()

  // Ищем последнюю АКТИВНУЮ сессию этого орга
  const { data: existingSession } = await supabase
    .from('kira_sessions')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let sessionId: string

  if (existingSession) {
    sessionId = existingSession.id
  } else {
    // Создаём новую сессию со статусом active
    const { data: newSession, error } = await supabase
      .from('kira_sessions')
      .insert({ org_id: orgId, status: 'active' })
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

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Закрываем сессию — только если она принадлежит этому орг (защита от чужих данных)
  const { error } = await supabase
    .from('kira_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId)
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
