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
  // 1. Валидация через Zod
  const parsed = UpdatePaymentMethodsSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Неверные данные' }
  }

  // 2. Авторизация — orgId берём из сессии, не из тела запроса
  const auth = await getAuthContext()
  if ('error' in auth) {
    return { success: false, error: 'Не авторизован' }
  }
  const { orgId, supabase } = auth as any

  // 3. Нормализация (никогда не пишем 'credit_card')
  const methods = parsed.data.enabled_payment_methods.map((m) =>
    (m as string) === 'credit_card' ? 'card' : m
  )

  // 4. Обновление в БД с явной проверкой org_id
  const { error } = await supabase
    .from('organizations')
    .update({ enabled_payment_methods: methods })
    .eq('id', orgId)

  if (error) {
    return { success: false, error: error.message }
  }

  // 5. Жёсткий сброс Next.js кэша для всех путей, читающих методы оплаты
  revalidatePath('/settings/payments')
  revalidatePath('/(dashboard)/payments')
  revalidatePath('/(dashboard)/visits')
  revalidatePath('/(dashboard)/finances')
  revalidatePath('/payments')

  return { success: true }
}
