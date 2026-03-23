import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET — проверить статус онбординга
export async function GET() {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('org_users')
    .select('onboarding_completed, onboarding_language')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  return NextResponse.json({
    completed: data?.onboarding_completed ?? false,
    language: data?.onboarding_language ?? null,
  })
}

// POST — завершить онбординг
export async function POST(request: NextRequest) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const { language } = await request.json()

  const supabase = createSupabaseServiceClient()
  await supabase
    .from('org_users')
    .update({
      onboarding_completed: true,
      onboarding_language: language ?? 'ru',
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('user_id', auth.user.id)

  return NextResponse.json({ success: true })
}
