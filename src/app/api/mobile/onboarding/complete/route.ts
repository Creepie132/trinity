/**
 * POST /api/mobile/onboarding/complete
 * Пометить онбординг завершённым.
 * Auth: Bearer token.
 *
 * Записывает features.onboarding_completed_at = now().
 * Returns: { ok: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()

    const { data: org, error: fetchErr } = await service
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const features = (org?.features as Record<string, unknown>) ?? {}
    const updated  = {
      ...features,
      onboarding_completed_at: new Date().toISOString(),
    }

    const { error } = await service
      .from('organizations')
      .update({ features: updated })
      .eq('id', orgId)

    if (error) {
      console.error('[onboarding/complete]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[onboarding/complete]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
