import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { parentOrgId, branchName, orgName, address, phone, category } = body

    if (!parentOrgId || !branchName || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user is owner of parent org
    const { data: membership } = await supabase
      .from('org_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', parentOrgId)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owners can create branches' }, { status: 403 })
    }

    // Use service role to bypass RLS
    const service = createSupabaseServiceClient()

    const { data: newOrg, error: orgError } = await service
      .from('organizations')
      .insert({
        name: orgName,
        phone: phone || null,
        category: category || 'other',
        plan: 'basic',
        is_active: true,
        features: {},
      })
      .select()
      .single()

    if (orgError) throw orgError

    const { data: branch, error: branchError } = await service
      .from('branches')
      .insert({
        parent_org_id: parentOrgId,
        child_org_id: newOrg.id,
        name: branchName,
        address: address || null,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single()

    if (branchError) throw branchError

    await service.from('org_users').insert({
      user_id: user.id,
      org_id: newOrg.id,
      role: 'owner',
    })

    return NextResponse.json({ branch, org: newOrg })
  } catch (error: any) {
    console.error('Create branch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
