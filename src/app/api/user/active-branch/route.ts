import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { getActiveOrgId } from '@/lib/get-active-org'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const activeOrgId = await getActiveOrgId(auth.user.id, auth.orgId)

  return NextResponse.json({ activeOrgId })
}
