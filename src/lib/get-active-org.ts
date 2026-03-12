import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Получить активный org_id пользователя из user_active_branch таблицы.
 * Источник истины на сервере — не заголовки, не localStorage.
 * Fallback: возвращает mainOrgId если запись не найдена.
 */
export async function getActiveOrgId(
  userId: string,
  mainOrgId: string
): Promise<string> {
  const { data } = await supabaseAdmin
    .from('user_active_branch')
    .select('active_org_id')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.active_org_id ?? mainOrgId
}
