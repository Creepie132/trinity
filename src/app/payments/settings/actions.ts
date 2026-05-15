'use server'

import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── saveBillingProfile ───────────────────────────────────────────────────────
// Server Action: сохраняет настройки шлюза через RPC save_billing_profile.
//
// БЕЗОПАСНОСТЬ:
//   - p_api_key и p_encryption_key никогда не попадают в логи Vercel
//   - p_encryption_key берётся из process.env — клиент его не видит
//   - Шифрование происходит внутри Postgres через pgp_sym_encrypt
//   - RPC сама проверяет org_id из JWT (защита от подмены)
// ─────────────────────────────────────────────────────────────────────────────

export type SaveBillingResultOk  = { ok: true;  terminal_name: string }
export type SaveBillingResultErr = { ok: false; error: string }
export type SaveBillingResult    = SaveBillingResultOk | SaveBillingResultErr

export async function saveBillingProfile(formData: FormData): Promise<SaveBillingResult> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, error: 'Unauthorized' }
  }

  const orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) {
    return { ok: false, error: 'No organization' }
  }

  const gateway      = (formData.get('gateway')       as string)?.trim()
  const terminalName = (formData.get('terminal_name') as string)?.trim()
  const apiKey       = (formData.get('api_key')       as string)?.trim()

  if (!gateway || !terminalName || !apiKey) {
    return { ok: false, error: 'All fields are required' }
  }

  // Мастер-ключ из переменных окружения — не передаётся клиентом, не логируется
  const encryptionKey = process.env.TRANZILA_ENCRYPTION_SECRET
  if (!encryptionKey || encryptionKey.length < 16) {
    console.error('[PAYMENTS_MODULE_ERROR] TRANZILA_ENCRYPTION_SECRET not configured or too weak')
    return { ok: false, error: 'Server configuration error' }
  }

  // RPC вызов — шифрование происходит внутри Postgres
  // service client используем чтобы передать user JWT через rpc с правильным auth
  const supabaseAuth = await createClient()
  const { data, error } = await supabaseAuth.rpc('save_billing_profile', {
    p_org_id:         orgId,
    p_gateway:        gateway,
    p_terminal_name:  terminalName,
    p_api_key:        apiKey,
    p_encryption_key: encryptionKey,
  })

  if (error) {
    // Не логируем параметры — в них может быть api_key
    console.error('[PAYMENTS_MODULE_ERROR] save_billing_profile RPC failed:', error.code, error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true, terminal_name: terminalName }
}

// ─── getBillingProfile ────────────────────────────────────────────────────────
// Читает текущий профиль шлюза для отображения в UI.
// Возвращает terminal_name и gateway — БЕЗ api_key (он зашифрован в bytea).

export interface BillingProfileData {
  gateway:       string
  terminal_name: string
  is_active:     boolean
  updated_at:    string
}

export async function getBillingProfile(): Promise<BillingProfileData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) return null

  const service = createSupabaseServiceClient()
  const { data } = await service
    .from('billing_profiles')
    .select('gateway, terminal_name, is_active, updated_at')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single()

  return data ?? null
}
