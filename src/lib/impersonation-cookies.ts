/**
 * Константы кук impersonation — shared между actions и api routes.
 * НЕ server-only, поэтому экспорт const разрешён.
 */
export const COOKIE_ORG_ID   = 'impersonate_org_id'
export const COOKIE_ORG_NAME = 'impersonate_org_name'

export const IMPERSONATE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 8, // 8 часов
}
