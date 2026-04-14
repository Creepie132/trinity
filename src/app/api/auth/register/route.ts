import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { PLAN_MODULES } from '@/lib/plan-limits'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Rate limit: 5 попыток с одного IP за 10 минут
const rateMap = new Map<string, { count: number; resetAt: number }>()
function checkRate(ip: string): boolean {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 600_000 }); return true }
  if (e.count >= 5) return false
  e.count++; return true
}

// Валидация email
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
}

// Только латиница, цифры, спецсимволы — никакой кириллицы/иврита
function isLatinOnly(str: string): boolean {
  return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]+$/.test(str)
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRate(ip)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const name: string  = (body.name  ?? '').trim()
    const email: string = (body.email ?? '').trim().toLowerCase()
    const pass: string  = (body.password ?? '').trim()

    // ── Валидация ──────────────────────────────────────────────
    if (!name || !email || !pass) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Name must be 2–60 characters' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (pass.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!isLatinOnly(pass)) {
      return NextResponse.json({ error: 'Password must contain only Latin characters and numbers' }, { status: 400 })
    }
    if (pass.length > 128) {
      return NextResponse.json({ error: 'Password is too long' }, { status: 400 })
    }

    // ── Проверка — нет ли уже такого email ────────────────────
    const service = createSupabaseServiceClient()
    const { data: existing } = await service
      .from('org_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    // Supabase Auth сам вернёт ошибку при дубле — дополнительная проверка через Auth Admin
    // (опционально — не блокируем, Supabase сам обработает)

    // ── Создаём пользователя в Supabase Auth ──────────────────
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
        emailRedirectTo: 'https://www.ambersol.co.il/auth/confirm'
      }
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
        return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    const userId = signUpData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Registration failed. Try again.' }, { status: 500 })
    }

    // ── Создаём организацию для нового пользователя ───────────
    const { data: org, error: orgError } = await service
      .from('organizations')
      .insert({
        name: `${name}'s Business`,
        plan: 'free',
        features: {},
        created_by: userId,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('[register] org create error:', orgError)
      // Не фатально — пользователь создан, онбординг доделает остальное
    }

    if (org?.id) {
      // Включаем только модули Free плана
      const freeModules = PLAN_MODULES['free'] as string[]
      const modulesObj = Object.fromEntries(
        freeModules.map(k => [k, true])
      )

      // Обновляем features с модулями
      await service
        .from('organizations')
        .update({ features: { modules: modulesObj } })
        .eq('id', org.id)

      // Привязываем пользователя к организации как owner
      await service.from('org_users').insert({
        user_id: userId,
        org_id: org.id,
        role: 'owner',
      })
      // Устанавливаем активную ветку
      await service.from('user_active_branch').upsert({
        user_id: userId,
        active_org_id: org.id,
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({
      ok: true,
      message: 'Verification email sent. Please check your inbox.',
      userId,
    })

  } catch (err) {
    console.error('[register] unexpected error:', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
