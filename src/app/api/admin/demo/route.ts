import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getAuthContext } from '@/lib/auth-helpers'

// Generate random readable password: 3 words style e.g. "Sky7Blue!"
function generatePassword(): string {
  const words = ['Rose','Star','Moon','Blue','Gold','Fire','Wave','Lion','Sage','Dawn']
  const w1 = words[Math.floor(Math.random() * words.length)]
  const w2 = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${w1}${num}${w2}!`
}

function generateEmail(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20)
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `demo-${slug}-${rand}@trinity-demo.app`
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { label, hours = 24, modules } = await request.json()
  if (!label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const email = generateEmail(label)
  const password = generatePassword()
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString()

  // Build modules features
  const allModules = ['diary','sales','visits','booking','clients','branches','payments','analytics','inventory','subscriptions']
  const selectedModules: string[] = modules || ['clients','visits','payments','analytics']
  const modulesFeatures: Record<string, boolean> = {}
  allModules.forEach(k => { modulesFeatures[k] = selectedModules.includes(k) })

  // 1. Create org
  const orgId = crypto.randomUUID()
  const { error: orgError } = await service.from('organizations').insert({
    id: orgId,
    name: `Demo: ${label}`,
    plan: 'demo',
    subscription_status: 'demo',
    subscription_expires_at: expiresAt,
    features: {
      modules: modulesFeatures,
      payments: modulesFeatures.payments,
      analytics: modulesFeatures.analytics,
      inventory: modulesFeatures.inventory,
      subscriptions: modulesFeatures.subscriptions,
      sms: false,
      price_mode: 'auto',
      client_limit: 50,
      manual_price: 0,
      monthly_price: 0,
      onboarding_completed: true,
      is_demo: true,
      business_info: { owner_name: label, display_name: `Demo: ${label}`, mobile: '', address: '', city: '' },
    },
  })
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  // 2. Create auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email, password,
    email_confirm: true,
    user_metadata: { full_name: label, org_id: orgId },
    app_metadata: { org_id: orgId },
  })
  if (authError || !authData?.user) {
    await service.from('organizations').delete().eq('id', orgId)
    return NextResponse.json({ error: authError?.message || 'user create failed' }, { status: 500 })
  }

  const userId = authData.user.id
  await service.from('org_users').insert({ user_id: userId, org_id: orgId, email, role: 'owner' })
  await service.from('user_active_branch').insert({ user_id: userId, active_org_id: orgId })

  // 3. Save demo session
  await service.from('demo_sessions').insert({
    label, email, password_plain: password,
    org_id: orgId, user_id: userId, expires_at: expiresAt,
  })

  return NextResponse.json({ email, password, expires_at: expiresAt, org_id: orgId })
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createSupabaseServiceClient()
  const { data } = await service
    .from('demo_sessions')
    .select('id, label, email, password_plain, expires_at, created_at, is_active, org_id')
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data || [])
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  if (auth.user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await request.json()
  const service = createSupabaseServiceClient()
  const { data: session } = await service.from('demo_sessions').select('user_id, org_id').eq('id', id).single()
  if (session?.user_id) await service.auth.admin.deleteUser(session.user_id)
  if (session?.org_id) await service.from('organizations').delete().eq('id', session.org_id)
  await service.from('demo_sessions').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
