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

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        full_name: full_name?.trim() || normalizedEmail.split('@')[0],
        is_sales_agent: true,
      },
      redirectTo: `${appUrl}/callback?next=/worker`,
    })

  if (inviteError) {
    const alreadyExists =
      inviteError.status === 422 ||
      inviteError.message?.toLowerCase().includes('already')

    if (alreadyExists) {
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = listData?.users?.find((u: { email?: string }) => u.email === normalizedEmail)

      if (!found) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
      }

      await supabase.from('admin_users').upsert(
        { user_id: found.id, email: normalizedEmail, full_name: full_name ?? found.user_metadata?.full_name ?? '', is_sales_agent: true },
        { onConflict: 'user_id' }
      )

      const RESEND_API_KEY = process.env.RESEND_API_KEY
      if (RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Trinity CRM <noreply@send.ambersol.co.il>',
              to: normalizedEmail,
              subject: 'Доступ в Trinity CRM — Кабинет продажника',
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#1B2A4A,#2d4a7a);border-radius:12px;margin-bottom:24px">
                  <h1 style="color:#fff;margin:0;font-size:26px">Trinity CRM</h1>
                  <p style="color:#C8922A;margin:6px 0 0;font-size:14px">Кабинет продажника</p>
                </div>
                <p style="color:#334155;font-size:16px;line-height:1.6">Привет! Вам открыт доступ в <strong>Кабинет продажника Trinity CRM</strong>.</p>
                <p style="color:#334155;font-size:16px;line-height:1.6">Войдите по кнопке ниже, используя этот email:</p>
                <p style="color:#1B2A4A;font-weight:bold;font-size:16px">${normalizedEmail}</p>
                <div style="text-align:center;margin:32px 0">
                  <a href="${appUrl}/login" style="background:#C8922A;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block">Войти в кабинет →</a>
                </div>
                <p style="color:#64748B;font-size:14px">После входа вы автоматически попадёте в кабинет продажника.</p>
                <p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:30px">Amber Solutions © 2025 · Trinity CRM</p>
              </div>`,
            }),
          })
          const resendBody = await resendRes.json().catch(() => null)
          if (!resendRes.ok) {
            console.error('[sales-agents] resend error:', resendRes.status, resendBody)
          } else {
            console.log('[sales-agents] resend ok, id:', resendBody?.id)
          }
        } catch (e) {
          console.error('[sales-agents] resend exception:', e)
        }
      } else {
        console.warn('[sales-agents] RESEND_API_KEY not set — falling back to Supabase generateLink')
        try {
          const { error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
            options: { redirectTo: `${appUrl}/auth/callback?next=/worker` },
          })
          if (linkError) {
            console.error('[sales-agents] generateLink error:', linkError.message)
          } else {
            console.log('[sales-agents] magic link sent via Supabase SMTP to:', normalizedEmail)
          }
        } catch (e) {
          console.error('[sales-agents] generateLink exception:', e)
        }
      }

      return NextResponse.json({ success: true, status: 'flag_set', email: normalizedEmail })
    }

    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const userId = inviteData?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Не удалось создать пользователя' }, { status: 500 })
  }

  await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      email: normalizedEmail,
      full_name: full_name?.trim() || normalizedEmail.split('@')[0],
      is_sales_agent: true,
    },
    { onConflict: 'user_id' }
  )

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

// DELETE — снять роль ИЛИ полностью удалить из auth
// Body: { user_id, delete_from_auth?: boolean }
export async function DELETE(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { user_id, delete_from_auth } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createSupabaseServiceClient()

  if (delete_from_auth) {
    // Полное удаление из Supabase Auth + admin_users
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user_id)
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })
    }
    await supabase.from('admin_users').delete().eq('user_id', user_id)

    void supabase.from('audit_log').insert({
      org_id: null,
      user_id: auth.user.id,
      action: 'sales_agent_deleted',
      entity_type: 'admin_users',
      entity_id: user_id,
    })

    return NextResponse.json({ success: true, status: 'deleted' })
  }

  // Просто снять флаг
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

  return NextResponse.json({ success: true, status: 'removed' })
}
