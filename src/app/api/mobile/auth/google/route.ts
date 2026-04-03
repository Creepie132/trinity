import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getActiveOrgId } from '@/lib/get-active-org'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { id_token } = await request.json()
    if (!id_token) {
      return NextResponse.json({ error: 'id_token is required' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    })

    if (authError || !authData.session) {
      console.error('[mobile/auth/google]', authError)
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const { session, user } = authData
    const service = createSupabaseServiceClient()

    let orgId = user.app_metadata?.org_id as string | undefined
    if (!orgId) {
      const { data: orgUser } = await service
        .from('org_users').select('org_id').eq('user_id', user.id).single()
      if (!orgUser?.org_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 403 })
      }
      orgId = orgUser.org_id
    }

    const activeOrgId = await getActiveOrgId(user.id, orgId)

    return NextResponse.json({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      expires_at:    session.expires_at,
      user_id:       user.id,
      email:         user.email,
      org_id:        activeOrgId,
      main_org_id:   orgId,
      role:          user.app_metadata?.org_role ?? null,
      is_admin:      user.app_metadata?.is_admin === true,
    })
  } catch (err) {
    console.error('[mobile/auth/google]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
