import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/client-self-edit/generate
 * Body: { client_id: string }
 * Генерирует 24-часовой токен для self-edit ссылки.
 * Вызывается из CRM (авторизованный запрос).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const body = await req.json()
    const { client_id } = body as { client_id?: string }

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Убеждаемся что клиент принадлежит этой org
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, org_id, first_name, last_name')
      .eq('id', client_id)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Деактивируем старые токены этого клиента
    await supabase
      .from('client_edit_tokens')
      .update({ is_active: false })
      .eq('client_id', client_id)
      .eq('is_active', true)

    // Создаём новый токен
    const { data: tokenRow, error: insertErr } = await supabase
      .from('client_edit_tokens')
      .insert({
        client_id,
        org_id: orgId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token, expires_at')
      .single()

    if (insertErr || !tokenRow) {
      console.error('[generate-token] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'
    const editUrl = `${baseUrl}/edit-profile/${tokenRow.token}`

    return NextResponse.json({
      token: tokenRow.token,
      url: editUrl,
      expires_at: tokenRow.expires_at,
    })
  } catch (err: any) {
    console.error('[generate-token] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
