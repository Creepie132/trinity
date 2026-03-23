import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registration_id, tranzila_token, transaction_id } = body

    if (!registration_id) {
      return NextResponse.json({ error: 'registration_id required' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // 1. Fetch registration
    const { data: reg, error: regError } = await service
      .from('demo_registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (regError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Already activated — idempotent
    if (reg.status === 'paid' && reg.org_id) {
      return NextResponse.json({ org_id: reg.org_id, already_activated: true })
    }

    // 2. Build features from selected_modules
    const moduleKeys = ['diary','sales','visits','booking','clients','branches',
                        'payments','analytics','inventory','subscriptions']
    const modulesFeatures: Record<string, boolean> = {}
    moduleKeys.forEach(k => { modulesFeatures[k] = (reg.selected_modules || []).includes(k) })

    // 3. Create organization
    const orgId = crypto.randomUUID()
    // Demo org: активна 30 дней, потом переходит в 'expired'
    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 30)

    const { error: orgError } = await service.from('organizations').insert({
      id: orgId,
      name: reg.business_name,
      plan: 'pro',
      subscription_status: 'demo',
      subscription_expires_at: trialExpiry.toISOString(),
      features: {
        modules: modulesFeatures,
        payments: modulesFeatures.payments,
        analytics: modulesFeatures.analytics,
        inventory: modulesFeatures.inventory,
        subscriptions: modulesFeatures.subscriptions,
        sms: false,
        price_mode: 'auto',
        client_limit: null,
        manual_price: 0,
        monthly_price: reg.monthly_fee,
        onboarding_completed: false,
        is_demo: true,
        tranzila_token: tranzila_token || null,
        business_info: {
          owner_name: `${reg.first_name} ${reg.last_name}`,
          display_name: reg.business_name,
          mobile: reg.phone,
          address: reg.address || '',
          city: reg.city || '',
        },
      },
    })
    if (orgError) {
      console.error('[demo/activate] org insert:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // 4. Create Supabase auth user
    const email = reg.email || `${reg.phone.replace(/\D/g,'')}@trinity-crm.app`
    const tempPassword = crypto.randomUUID()

    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: `${reg.first_name} ${reg.last_name}`, org_id: orgId },
      app_metadata: { org_id: orgId },
    })

    if (authError || !authData?.user) {
      console.error('[demo/activate] auth user create:', authError)
      // Rollback org
      await service.from('organizations').delete().eq('id', orgId)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const userId = authData.user.id

    // 5. Link user to org
    await service.from('org_users').insert({ user_id: userId, org_id: orgId, email, role: 'owner' })
    await service.from('user_active_branch').insert({ user_id: userId, active_org_id: orgId })

    // 6. Mark registration as paid
    await service.from('demo_registrations').update({
      status: 'paid',
      org_id: orgId,
      user_id: userId,
      tranzila_token: tranzila_token || null,
      tranzila_transaction_id: transaction_id || null,
      paid_at: new Date().toISOString(),
    }).eq('id', registration_id)

    // 7. Send magic link so user can log in immediately
    const { data: magicData } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    return NextResponse.json({
      success: true,
      org_id: orgId,
      user_id: userId,
      email,
      magic_link: magicData?.properties?.action_link || null,
    })
  } catch (err) {
    console.error('[demo/activate] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
