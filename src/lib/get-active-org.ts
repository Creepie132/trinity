import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Суперадмины могут impersonate любую org — для них валидация филиала пропускается
const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

/**
 * Получить активный org_id пользователя из user_active_branch таблицы.
 * Источник истины на сервере — не заголовки, не localStorage.
 *
 * Security: после чтения из БД всегда валидируем что значение
 * принадлежит mainOrg или её легитимному филиалу. Это защищает от
 * сценария когда user_active_branch был напрямую подделан (слабый RLS,
 * race condition, etc.) — злоумышленник не может таким образом
 * переключиться на чужую организацию.
 *
 * Исключение: суперадмины могут impersonate любую организацию.
 * Для них проверка принадлежности к филиалам пропускается.
 *
 * Performance: обёрнут в React cache() — если getActiveOrgId() вызывается
 * несколько раз в одном серверном запросе (checkAuth + getAuthContext),
 * БД-запрос выполняется только один раз.
 *
 * Fallback: возвращает mainOrgId если запись не найдена или не прошла валидацию.
 */
export const getActiveOrgId = cache(async (
  userId: string,
  mainOrgId: string
): Promise<string> => {
  const { data } = await supabaseAdmin
    .from('user_active_branch')
    .select('active_org_id')
    .eq('user_id', userId)
    .maybeSingle()

  const stored = data?.active_org_id

  // Нет сохранённого значения → основная org
  if (!stored) return mainOrgId

  // Основная org — всегда валидна
  if (stored === mainOrgId) return mainOrgId

  // Суперадмин: проверяем email через auth.users — если да, пропускаем проверку филиала.
  // Это позволяет impersonation работать корректно без bypassing общей безопасности.
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authUser?.user?.email && SUPER_ADMINS.includes(authUser.user.email)) {
    // Дополнительно: убеждаемся что org действительно существует
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', stored)
      .maybeSingle()
    if (org) return stored
  }

  // Проверяем что stored является легитимным филиалом mainOrgId
  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('child_org_id')
    .eq('parent_org_id', mainOrgId)
    .eq('child_org_id', stored)
    .maybeSingle()

  // Легитимный филиал → возвращаем; иначе → безопасный fallback
  if (branch) return stored

  // Подозрительно: в user_active_branch записан org_id не из нашего дерева.
  // Логируем и возвращаем mainOrgId как безопасное значение.
  console.warn(
    `[security] getActiveOrgId: user ${userId} has stored active_org_id=${stored} ` +
    `which is NOT a valid branch of mainOrgId=${mainOrgId}. Falling back to mainOrgId.`
  )
  return mainOrgId
})
