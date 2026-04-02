import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_ORG_ID, COOKIE_ORG_NAME } from '@/lib/impersonation-cookies'

/**
 * GET /api/admin/impersonation-state
 * Клиент читает HttpOnly куку через этот route (document.cookie её не видит).
 */
export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const orgId   = cookieStore.get(COOKIE_ORG_ID)?.value
  const orgName = cookieStore.get(COOKIE_ORG_NAME)?.value

  if (!orgId || !orgName) {
    return NextResponse.json({ active: false })
  }

  return NextResponse.json({ active: true, orgId, orgName })
}
