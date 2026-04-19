// src/app/callback/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { pathFromLandingId, DEFAULT_LANDING_PATH } from '@/lib/landing-pages'

/**
 * Читает предпочтительную главную страницу пользователя.
 * Используется здесь только для "обычных" owner/staff, не для админов/sales-agent.
 * При любой ошибке — безопасный fallback на /dashboard.
 */
async function getUserLandingPath(
  adminClient: any,
  userId: string
): Promise<string> {
  try {
    const { data } = await adminClient
      .from('user_nav_preferences')
      .select('default_landing_page')
      .eq('user_id', userId)
      .maybeSingle()
    return pathFromLandingId(data?.default_landing_page)
  } catch {
    return DEFAULT_LANDING_PATH
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') || ''
  const origin = request.nextUrl.origin
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/login`)
  }

  const user = data.user

  if (!user.id) {
    return NextResponse.redirect(`${origin}/access-pending`)
  }

  // Create admin client (bypasses RLS — needed for auto-link and org checks)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auto-link invited users: find org_users rows with this email and user_id=null
  // Must use admin client — anon client cannot update rows where user_id IS NULL (RLS)
  let wasLinked = false
  if (user.email) {
    try {
      const { data: linkedRows } = await supabaseAdmin
        .from('org_users')
        .update({ user_id: user.id })
        .eq('email', user.email.toLowerCase())
        .is('user_id', null)
        .select('org_id, role')

      if (linkedRows && linkedRows.length > 0) {
        wasLinked = true
        notifyAdminsOfInvitedUser(user, linkedRows).catch((e) =>
          console.error('[Callback] Admin notification error:', e)
        )
      }
    } catch (e) {
      console.error('Auto-link error:', e)
    }
  }

  // 1) Check if admin or sales agent
  // Проверяем по user_id (уже зарегистрированный) ИЛИ по email (первый вход по инвайту)
  let adminRecord = null

  const { data: adminById } = await supabaseAdmin
    .from('admin_users')
    .select('user_id, email, is_sales_agent')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminById) {
    adminRecord = adminById
  } else if (user.email) {
    // Первый вход: ищем по email (user_id ещё не был привязан)
    const { data: adminByEmail } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, email, is_sales_agent')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    if (adminByEmail) {
      // Привязываем user_id к записи
      await supabaseAdmin
        .from('admin_users')
        .update({ user_id: user.id })
        .eq('email', user.email.toLowerCase())
      adminRecord = { ...adminByEmail, user_id: user.id }
    }
  }

  if (adminRecord) {
    // Продажник Trinity → онбординг (если не прошёл) или сразу в кабинет
    if (adminRecord.is_sales_agent) {
      const { data: agentRow } = await supabaseAdmin
        .from('admin_users')
        .select('sales_onboarding_completed')
        .eq('user_id', adminRecord.user_id)
        .maybeSingle()
      const onboardingDone = agentRow?.sales_onboarding_completed === true
      return NextResponse.redirect(`${origin}${onboardingDone ? '/worker' : '/worker/onboarding'}`)
    }
    // Суперадмин-не-sales-agent: если у него есть своя org (owner/staff) —
    // уважаем его выбранную "главную страницу". Это нормальный пользовательский
    // сценарий (например, Vlad: суперадмин + owner Amber Solutions).
    // Если orgs нет (чисто-админский аккаунт) — fallback на /dashboard.
    const { data: adminOrg } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (adminOrg) {
      const landingPath = await getUserLandingPath(supabaseAdmin, user.id)
      return NextResponse.redirect(`${origin}${landingPath}`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Если в ссылке был next=/worker — значит это инвайт продажника
  // Даже если запись в admin_users ещё не найдена — проверяем по email напрямую
  if (nextParam.startsWith('/worker') && user.email) {
    const { data: salesCheck } = await supabaseAdmin
      .from('admin_users')
      .select('user_id, is_sales_agent, sales_onboarding_completed')
      .eq('email', user.email.toLowerCase())
      .eq('is_sales_agent', true)
      .maybeSingle()

    if (salesCheck) {
      if (!salesCheck.user_id || salesCheck.user_id !== user.id) {
        await supabaseAdmin
          .from('admin_users')
          .update({ user_id: user.id })
          .eq('email', user.email.toLowerCase())
      }
      const onboardingDone = salesCheck.sales_onboarding_completed === true
      return NextResponse.redirect(`${origin}${onboardingDone ? '/worker' : '/worker/onboarding'}`)
    }
  }

  // ── Trial onboarding flow ─────────────────────────────────────────────────
  // /demo/try passes ?next=/onboarding/trial → после OAuth идём на форму
  if (nextParam === '/onboarding/trial') {
    return NextResponse.redirect(`${origin}/onboarding/trial`)
  }

  // Legacy: /demo/try passes ?next=/demo/activate
  if (nextParam === '/demo/activate') {
    return NextResponse.redirect(`${origin}/demo/callback/google`)
  }

  // 2) Check if user is a member of any organization (owner or invited staff)
  // Use admin client to bypass RLS and see the just-linked row
  const { data: anyOrg } = await supabaseAdmin
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (anyOrg || wasLinked) {
    // User belongs to an org (owner, moderator, or invited staff)
    // → redirect to their chosen landing page (fallback /dashboard)
    const landingPath = await getUserLandingPath(supabaseAdmin, user.id)
    return NextResponse.redirect(`${origin}${landingPath}`)
  }

  // 3) Truly new user — нет орга → Auth-First Trial onboarding
  // Пользователь прошёл Google OAuth, но у него нет организации.
  // Отправляем на форму сбора данных: имя, телефон, название бизнеса.
  console.log('[Callback] New user with no org → /onboarding/trial')
  return NextResponse.redirect(`${origin}/onboarding/trial`)
}

// Non-blocking: notify all system admins when an invited user joins an org
async function notifyAdminsOfInvitedUser(
  user: { id: string; email?: string | null },
  linkedRows: { org_id: string; role: string }[]
) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const row of linkedRows) {
    const [{ data: org }, { data: adminUsers }, { data: ownerRow }] = await Promise.all([
      adminClient.from('organizations').select('name, phone').eq('id', row.org_id).single(),
      adminClient.from('admin_users').select('user_id'),
      adminClient
        .from('org_users')
        .select('email')
        .eq('org_id', row.org_id)
        .eq('role', 'owner')
        .maybeSingle(),
    ])

    if (!adminUsers || adminUsers.length === 0) continue

    const orgName = org?.name || 'Unknown'
    const orgPhone = org?.phone || ''
    const inviterEmail = ownerRow?.email || ''
    const notifDate = new Date().toLocaleDateString('ru-RU')

    await adminClient.from('notifications').insert(
      adminUsers.map((admin) => ({
        org_id: row.org_id,
        user_id: admin.user_id,
        type: 'access_invitation',
        title: 'Новый запрос доступа',
        body: `${user.email} хочет присоединиться к ${orgName}. Пригласил: ${inviterEmail}. Дата: ${notifDate}`,
        metadata: {
          invited_user_email: user.email,
          invited_user_id: user.id,
          org_id: row.org_id,
          org_name: orgName,
          invited_by_email: inviterEmail,
          invited_by_phone: orgPhone,
        },
      }))
    )
  }
}
