import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET — список активных продажников
export async function GET() {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, full_name, is_sales_agent, created_at')
    .eq('is_sales_agent', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data ?? [] })
}

// POST — пригласить нового продажника по email
// Body: { email, full_name? }
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { email, full_name } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'

  // 1. Отправляем инвайт через Supabase Auth
  //    Supabase сам отправит письмо со ссылкой для установки пароля
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        full_name: full_name?.trim() || normalizedEmail.split('@')[0],
        is_sales_agent: true,
      },
      redirectTo: `${appUrl}/auth/callback?next=/worker`,
    })

  if (inviteError) {
    const alreadyExists =
      inviteError.status === 422 ||
      inviteError.message?.toLowerCase().includes('already')

    if (alreadyExists) {
      // Пользователь уже существует — ищем его и ставим флаг
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = listData?.users?.find((u: { email?: string }) => u.email === normalizedEmail)

      if (!found) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
      }

      // Ставим флаг продажника
      await supabase.from('admin_users').upsert(
        { user_id: found.id, email: normalizedEmail, full_name: full_name ?? found.user_metadata?.full_name ?? '', is_sales_agent: true },
        { onConflict: 'user_id' }
      )

      // Генерируем новую ссылку для входа и отправляем письмо повторно
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'
      try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
          options: { redirectTo: `${appUrl}/auth/callback?next=/worker` },
        })

        if (!linkError && linkData?.properties?.action_link) {
          const RESEND_API_KEY = process.env.RESEND_API_KEY
          if (RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Trinity CRM <noreply@send.ambersol.co.il>',
                to: normalizedEmail,
                subject: 'Ваш доступ в Trinity CRM | Trinity CRM גישה שלך',
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                  <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#1B2A4A,#2d4a7a);border-radius:12px;margin-bottom:24px">
                    <h1 style="color:#fff;margin:0">Trinity CRM</h1>
                    <p style="color:#C8922A;margin:4px 0 0">Кабинет продажника</p>
                  </div>
                  <p style="color:#334155">Ваш доступ в кабинет продажника готов. Нажмите кнопку ниже для входа:</p>
                  <div style="text-align:center;margin:32px 0">
                    <a href="${linkData.properties.action_link}" style="background:#C8922A;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">Войти в кабинет →</a>
                  </div>
                  <p style="color:#94A3B8;font-size:12px;text-align:center">Ссылка действительна 24 часа · Amber Solutions © 2025</p>
                </div>`,
              }),
            })
          }
        }
      } catch (e) {
        // Не критично — флаг уже поставлен
        console.error('[sales-agents] generateLink error:', e)
      }

      return NextResponse.json({ success: true, status: 'flag_set', email: normalizedEmail })
    }

    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const userId = inviteData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Не удалось создать пользователя' }, { status: 500 })
  }

  // 2. Записываем флаг is_sales_agent в admin_users
  const { error: upsertError } = await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      email: normalizedEmail,
      full_name: full_name?.trim() || normalizedEmail.split('@')[0],
      is_sales_agent: true,
    },
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    console.error('[sales-agents] upsert error:', upsertError.message)
    // Не критично — инвайт уже отправлен, флаг можно поставить вручную
  }

  // 3. Аудит
  void supabase.from('audit_log').insert({
    org_id: null,
    user_id: auth.user.id,
    action: 'sales_agent_invited',
    entity_type: 'admin_users',
    entity_id: userId,
    new_data: { email: normalizedEmail },
  })

  return NextResponse.json({ success: true, status: 'invited', email: normalizedEmail })
}

// DELETE — снять флаг продажника
// Body: { user_id }
export async function DELETE(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('admin_users')
    .update({ is_sales_agent: false })
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void supabase.from('audit_log').insert({
    org_id: null,
    user_id: auth.user.id,
    action: 'sales_agent_removed',
    entity_type: 'admin_users',
    entity_id: user_id,
  })

  return NextResponse.json({ success: true })
}
