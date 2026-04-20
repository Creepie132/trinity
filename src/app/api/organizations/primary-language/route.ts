/**
 * GET  /api/organizations/primary-language — читает organizations.primary_language
 * POST /api/organizations/primary-language — обновляет organizations.primary_language
 *
 * Используется для многоязычных WhatsApp-триггеров: когда клиент указал оба
 * языка (HE+RU), этот язык выбирается как приоритетный для выбора шаблона
 * сообщения. Также служит fallback для клиентов без указанного языка.
 *
 * Auth: getAuthContext (web cookie или mobile Bearer).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('primary_language')
    .eq('id', auth.orgId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const lang = (data as any)?.primary_language === 'ru' ? 'ru' : 'he'
  return NextResponse.json({ primary_language: lang })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const lang = body?.primary_language
  if (lang !== 'he' && lang !== 'ru') {
    return NextResponse.json(
      { error: 'primary_language must be "he" or "ru"' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('organizations')
    .update({ primary_language: lang } as any)
    .eq('id', auth.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, primary_language: lang })
}
