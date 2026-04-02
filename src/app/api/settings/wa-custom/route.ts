/**
 * GET /api/settings/wa-custom — получить текущие custom WA настройки org
 * POST /api/settings/wa-custom — сохранить/обновить custom WA настройки
 * DELETE /api/settings/wa-custom — отключить custom WA (use_custom_wa = false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('wa_integrations')
    .select('use_custom_wa, custom_api_url, custom_vault_id, is_active, updated_at')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    console.error('[wa-custom GET]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({
    useCustomWa:  data?.use_custom_wa  ?? false,
    customApiUrl: data?.custom_api_url ?? '',
    hasToken:     !!data?.custom_vault_id,
    isActive:     data?.is_active      ?? false,
    updatedAt:    data?.updated_at     ?? null,
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  let body: { useCustomWa: boolean; customApiUrl?: string; customToken?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { useCustomWa, customApiUrl = '', customToken = '' } = body

  // Валидация: если включают custom — URL и токен обязательны
  if (useCustomWa && (!customApiUrl.trim() || !customToken.trim())) {
    return NextResponse.json(
      { error: 'customApiUrl and customToken are required when useCustomWa is true' },
      { status: 422 }
    )
  }

  const supabase = createSupabaseServiceClient()

  // Получаем текущую запись чтобы знать — update или insert
  const { data: existing } = await supabase
    .from('wa_integrations')
    .select('id, custom_vault_id')
    .eq('org_id', orgId)
    .maybeSingle()

  let customVaultId: string | null = existing?.custom_vault_id ?? null

  // Если передан новый токен — сохраняем в Vault
  if (useCustomWa && customToken.trim()) {
    const secretName = `wa_custom_key_${orgId}`

    if (customVaultId) {
      // Обновляем существующий секрет
      const { error: updateErr } = await supabase
        .rpc('vault_update_secret', {
          secret_id: customVaultId,
          secret:    customToken,
        })

      if (updateErr) {
        // Если vault_update_secret не существует — пересоздаём
        const { data: newId, error: createErr } = await supabase
          .rpc('vault_create_secret', {
            secret:      customToken,
            name:        secretName + '_' + Date.now(),
            description: `Custom WhatsApp token for org ${orgId}`,
          })
        if (createErr || !newId) {
          console.error('[wa-custom POST] vault create error:', createErr)
          return NextResponse.json({ error: 'Failed to store token' }, { status: 500 })
        }
        customVaultId = newId
      }
    } else {
      // Создаём новый секрет
      const { data: newId, error: vaultErr } = await supabase
        .rpc('vault_create_secret', {
          secret:      customToken,
          name:        secretName,
          description: `Custom WhatsApp token for org ${orgId}`,
        })
      if (vaultErr || !newId) {
        console.error('[wa-custom POST] vault error:', vaultErr)
        return NextResponse.json({ error: 'Failed to store token' }, { status: 500 })
      }
      customVaultId = newId
    }
  }

  // Upsert в wa_integrations
  const upsertPayload: Record<string, unknown> = {
    org_id:         orgId,
    use_custom_wa:  useCustomWa,
    custom_api_url: useCustomWa ? customApiUrl.trim() : null,
    custom_vault_id: useCustomWa ? customVaultId : null,
    // Если нет основной записи — ставим разумные дефолты
    provider_type:  existing ? undefined : 'whapi',
    is_active:      existing ? undefined : false,
  }

  // Убираем undefined-поля (Supabase не любит их при upsert)
  Object.keys(upsertPayload).forEach(k => {
    if (upsertPayload[k] === undefined) delete upsertPayload[k]
  })

  const { error: upsertErr } = await supabase
    .from('wa_integrations')
    .upsert(upsertPayload, { onConflict: 'org_id' })

  if (upsertErr) {
    console.error('[wa-custom POST] upsert error:', upsertErr)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }

  return NextResponse.json({ success: true, useCustomWa, hasToken: !!customVaultId })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('wa_integrations')
    .update({ use_custom_wa: false, custom_api_url: null, custom_vault_id: null })
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
