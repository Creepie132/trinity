import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── GET — список активных продажников ────────────────────────────────────────
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

// ─── helpers ──────────────────────────────────────────────────────────────────

async function sendInviteEmail(
  to: string,
  inviteLink: string,
  appUrl: string
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.warn('[sales-agents] RESEND_API_KEY not set — email not sent')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Trinity CRM <noreply@ambersol.co.il>',
      to,
      subject: 'Приглашение в Trinity CRM — Кабинет продажника',
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#1B2A4A,#2d4a7a);border-radius:12px;margin-bottom:24px">
    <h1 style="color:#fff;margin:0;font-size:26px">Trinity CRM</h1>
    <p style="color:#C8922A;margin:6px 0 0;font-size:14px">Кабинет продажника</p>
  </div>
  <p style="color:#334155;font-size:16px;line-height:1.6">
    Привет! Вас пригласили в <strong>Кабинет продажника Trinity CRM</strong>.
  </p>
  <p style="color:#334155;font-size:16px;line-height:1.6">
    Нажмите кнопку ниже, чтобы принять приглашение и создать аккаунт:
  </p>
  <div style="text-align:center;margin:32px 0">
    <a href="${inviteLink}"
       style="background:#C8922A;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block">
      Принять приглашение →
    </a>
  </div>
  <p style="color:#64748B;font-size:13px">
    Ссылка действительна 24 часа. Если вы не ожидали это письмо — просто проигнорируйте его.
  </p>
  <p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:30px">
    Amber Solutions © 2025 · Trinity CRM
  </p>
</div>`,
    }),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('[sales-agents] Resend error:', res.status, body)
    throw new Error(`Resend error ${res.status}: ${body?.message ?? 'unknown'}`)
  }
  console.log('[sales-agents] Invite email sent via Resend, id:', body?.id)
}

// ─── POST — пригласить нового продажника ──────────────────────────────────────
//
// Стратегия: generateLink(type='invite') генерирует ссылку БЕЗ отправки письма
// через Supabase SMTP (= нет rate limit). Письмо шлём сами через Resend.
//
// Если пользователь уже существует — ставим флаг is_sales_agent и шлём magic link
// через Resend без вызова Supabase SMTP.
//
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

  // ── Check if user already exists ──────────────────────────────────────────
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = listData?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
  )

  if (existingUser) {
    // User exists — set sales agent flag + send magic link via Resend
    await supabase.from('admin_users').upsert(
      {
        user_id: existingUser.id,
        email: normalizedEmail,
        full_name: full_name?.trim() || existingUser.user_metadata?.full_name || normalizedEmail.split('@')[0],
        is_sales_agent: true,
      },
      { onConflict: 'user_id' }
    )

    // Прописываем в app_metadata — middleware читает флаг из JWT без DB-запроса
    await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { is_sales_agent: true },
    })

    // Generate magic link WITHOUT sending via Supabase SMTP
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo: `${appUrl}/callback?next=/worker` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[sales-agents] generateLink error:', linkErr?.message)
      return NextResponse.json({ error: 'Не удалось сгенерировать ссылку входа' }, { status: 500 })
    }

    try {
      await sendInviteEmail(normalizedEmail, linkData.properties.action_link, appUrl)
    } catch (e) {
      console.error('[sales-agents] sendInviteEmail failed:', e)
      // Non-fatal: flag is set, link was generated; just email delivery failed
    }

    return NextResponse.json({ success: true, status: 'flag_set', email: normalizedEmail })
  }

  // ── New user — generate invite link WITHOUT Supabase SMTP ─────────────────
  // generateLink(type='invite') creates user + returns action_link, does NOT send email
  const { data: inviteLink, error: inviteErr } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: {
      data: {
        full_name: full_name?.trim() || normalizedEmail.split('@')[0],
        is_sales_agent: true,
      },
      redirectTo: `${appUrl}/callback?next=/worker`,
    },
  })

  if (inviteErr || !inviteLink?.user?.id || !inviteLink?.properties?.action_link) {
    console.error('[sales-agents] generateLink invite error:', inviteErr?.message)
    return NextResponse.json({ error: inviteErr?.message ?? 'Failed to generate invite link' }, { status: 500 })
  }

  const userId = inviteLink.user.id

  // Save to admin_users
  await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      email: normalizedEmail,
      full_name: full_name?.trim() || normalizedEmail.split('@')[0],
      is_sales_agent: true,
    },
    { onConflict: 'user_id' }
  )

  // Прописываем в app_metadata — middleware читает флаг из JWT без DB-запроса
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { is_sales_agent: true },
  })

  // Send invite email via Resend (not Supabase SMTP)
  try {
    await sendInviteEmail(normalizedEmail, inviteLink.properties.action_link, appUrl)
  } catch (e) {
    console.error('[sales-agents] sendInviteEmail failed:', e)
    // Non-fatal: user created, link generated, just email failed
  }

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


// ─── DELETE — снять роль ИЛИ полностью удалить из auth ────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { user_id, delete_from_auth } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createSupabaseServiceClient()

  if (delete_from_auth) {
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

  // Снять флаг
  const { error } = await supabase
    .from('admin_users')
    .update({ is_sales_agent: false })
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Снимаем и из app_metadata
  await supabase.auth.admin.updateUserById(user_id, {
    app_metadata: { is_sales_agent: false },
  })

  void supabase.from('audit_log').insert({
    org_id: null,
    user_id: auth.user.id,
    action: 'sales_agent_removed',
    entity_type: 'admin_users',
    entity_id: user_id,
  })

  return NextResponse.json({ success: true, status: 'removed' })
}
