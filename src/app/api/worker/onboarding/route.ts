import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET — проверить статус онбординга + профиля
export async function GET() {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('org_users')
    .select('onboarding_completed, onboarding_language, profile_completed, first_name, last_name, phone, birth_date, address, city')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  return NextResponse.json({
    completed: data?.onboarding_completed ?? false,
    language: data?.onboarding_language ?? null,
    profile_completed: data?.profile_completed ?? false,
    profile: {
      first_name: data?.first_name ?? '',
      last_name: data?.last_name ?? '',
      phone: data?.phone ?? '',
      birth_date: data?.birth_date ?? '',
      address: data?.address ?? '',
      city: data?.city ?? '',
      email: auth.user.email ?? '',
    },
  })
}

// POST — завершить онбординг (язык)
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

// PATCH — сохранить профиль
export async function PATCH(request: NextRequest) {
  const auth = await getWorkerAuthContext()
  if ('error' in auth) return auth.error

  const { first_name, last_name, phone, birth_date, address, city } = await request.json()
  const supabase = createSupabaseServiceClient()
  await supabase
    .from('org_users')
    .update({
      first_name: first_name?.trim() || null,
      last_name: last_name?.trim() || null,
      phone: phone?.trim() || null,
      birth_date: birth_date || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      profile_completed: true,
    })
    .eq('user_id', auth.user.id)

  // Обновляем full_name в auth.users тоже
  if (first_name || last_name) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.auth.admin.updateUserById(auth.user.id, {
      user_metadata: { full_name: `${first_name ?? ''} ${last_name ?? ''}`.trim() },
    })
  }

  return NextResponse.json({ success: true })
}
