'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthContext } from '@/lib/auth-helpers'

const VALID_METHODS = ['cash', 'card', 'bit', 'bank_transfer', 'check'] as const

const UpdatePaymentMethodsSchema = z.object({
  enabled_payment_methods: z
    .array(z.enum(VALID_METHODS))
    .min(1, 'Выберите хотя бы один способ оплаты'),
})

export type UpdatePaymentMethodsResult =
  | { success: true }
  | { success: false; error: string }

export async function updatePaymentMethods(
  raw: unknown
): Promise<UpdatePaymentMethodsResult> {
  const parsed = UpdatePaymentMethodsSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Неверные данные' }
  }

  const auth = await getAuthContext()
  if ('error' in auth) {
    return { success: false, error: 'Не авторизован' }
  }
  const { orgId, supabase } = auth as any

  const methods = parsed.data.enabled_payment_methods.map((m) =>
    (m as string) === 'credit_card' ? 'card' : m
  )

  const { error } = await supabase
    .from('organizations')
    .update({ enabled_payment_methods: methods })
    .eq('id', orgId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/payments')
  revalidatePath('/(dashboard)/payments')
  revalidatePath('/(dashboard)/visits')
  revalidatePath('/(dashboard)/finances')
  revalidatePath('/payments')

  return { success: true }
}

// ─── Tranzila credentials setup ───────────────────────────────────────────────

const TranzilaCredentialsSchema = z.object({
  tranzila_terminal:       z.string().min(1, 'Введите имя терминала'),
  tranzila_password:       z.string().min(1, 'Введите пароль терминала'),
  tranzila_token_terminal: z.string().optional(),
  tranzila_token_password: z.string().optional(),
})

export type SaveTranzilaResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Сохраняет учётные данные Tranzila для текущей организации.
 * После успешного сохранения — включает метод 'card' в enabled_payment_methods.
 * orgId берётся строго из сессии — не из тела запроса.
 */
export async function saveTranzilaCredentials(
  raw: unknown
): Promise<SaveTranzilaResult> {
  const parsed = TranzilaCredentialsSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Неверные данные' }
  }

  const auth = await getAuthContext()
  if ('error' in auth) {
    return { success: false, error: 'Не авторизован' }
  }
  const { orgId, supabase } = auth as any

  const { tranzila_terminal, tranzila_password, tranzila_token_terminal, tranzila_token_password } = parsed.data

  // 1. Читаем текущие enabled_payment_methods чтобы не затереть остальные
  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('enabled_payment_methods')
    .eq('id', orgId)
    .single()

  if (fetchErr) return { success: false, error: fetchErr.message }

  const current: string[] = org?.enabled_payment_methods ?? ['cash', 'card']
  const withCard = current.includes('card') ? current : [...current, 'card']

  // 2. Сохраняем credentials + включаем 'card'
  const payload: Record<string, any> = {
    tranzila_terminal:           tranzila_terminal.trim(),
    tranzila_password:           tranzila_password.trim(),
    enabled_payment_methods:     withCard,
  }
  if (tranzila_token_terminal?.trim()) payload.tranzila_token_terminal = tranzila_token_terminal.trim()
  if (tranzila_token_password?.trim()) payload.tranzila_token_password = tranzila_token_password.trim()

  const { error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('id', orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/payments')
  revalidatePath('/(dashboard)/payments')
  revalidatePath('/(dashboard)/visits')

  return { success: true }
}

/**
 * Отключает Tranzila: очищает credentials и убирает 'card' из enabled_payment_methods.
 */
export async function disconnectTranzila(): Promise<SaveTranzilaResult> {
  const auth = await getAuthContext()
  if ('error' in auth) return { success: false, error: 'Не авторизован' }
  const { orgId, supabase } = auth as any

  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('enabled_payment_methods')
    .eq('id', orgId)
    .single()

  if (fetchErr) return { success: false, error: fetchErr.message }

  const without = (org?.enabled_payment_methods ?? []).filter((m: string) => m !== 'card')
  const safeWithout = without.length > 0 ? without : ['cash']

  const { error } = await supabase
    .from('organizations')
    .update({
      tranzila_terminal:       null,
      tranzila_password:       null,
      tranzila_token_terminal: null,
      tranzila_token_password: null,
      enabled_payment_methods: safeWithout,
    })
    .eq('id', orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/payments')
  revalidatePath('/(dashboard)/payments')

  return { success: true }
}
