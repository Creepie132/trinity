import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const action = searchParams.get('action') // 'approve' or 'reject'
  const token = searchParams.get('token')

  if (!userId || !action) {
    return new Response('Missing parameters', { status: 400 })
  }

  console.log('=== ACCESS REVIEW ===')
  console.log('User ID:', userId)
  console.log('Action:', action)

  // Check if request exists and is pending
  const { data: accessRequest } = await supabaseAdmin
    .from('access_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!accessRequest) {
    return new Response(
      `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>❌ Запрос не найден или уже обработан</h2>
        <p>Request not found or already processed</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  if (action === 'approve') {
    console.log('=== APPROVE START ===')
    console.log('User ID:', userId)
    console.log('Email:', accessRequest.email)
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14) // 14 days trial

    // Update access request
    await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        access_expires_at: expiresAt.toISOString(),
      })
      .eq('id', accessRequest.id)

    // Find user's organization
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('Existing orgUser:', orgUser)
    
    let orgId = orgUser?.org_id
    console.log('OrgId before creation:', orgId)

    if (!orgId) {
      console.log('Creating new organization...')
      // Create new organization for new user
      console.log('No organization found, creating new one for user:', userId)
      
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'New Business'
      
      // Add unique suffix to prevent duplicate name errors
      const uniqueSuffix = Math.random().toString(36).substring(2, 8)
      const orgName = `${userName}_${uniqueSuffix}`
      
      console.log('Generated unique org name:', orgName)

      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: orgName,
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          trial_started_at: new Date().toISOString(),
          features: {
            modules: {
              clients: true,
              visits: false,
              booking: false,
              inventory: false,
              payments: false,
              sms: false,
              subscriptions: false,
              statistics: false,
              reports: false,
              telegram: false,
              loyalty: false,
              birthday: false,
            },
          },
        })
        .select('id')
        .single()

      if (orgError) {
        console.error('Error creating organization:', orgError)
        return new Response(
          `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
            <h2 style="color:red">❌ Error</h2>
            <p>${orgError.message}</p>
          </body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }

      orgId = newOrg.id
      console.log('Created organization:', orgId)

      // Link user to organization
      await supabaseAdmin
        .from('org_users')
        .insert({
          user_id: userId,
          org_id: orgId,
          role: 'owner',
        })

      console.log('User linked to organization as owner')
    } else {
      // Activate trial for existing organization
      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          trial_started_at: new Date().toISOString(),
        })
        .eq('id', orgId)

      console.log('Trial activated for existing org:', orgId)
    }

    console.log('=== APPROVE END ===')
    console.log('Final orgId:', orgId)
    console.log('Expires at:', expiresAt.toISOString())

    return new Response(
      `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2 style="color:green">✅ Доступ одобрен / Access Approved</h2>
        <p><strong>${accessRequest.email}</strong> — 14 дней trial</p>
        <p>До: ${expiresAt.toLocaleDateString('ru-RU')}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } else if (action === 'reject') {
    await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', accessRequest.id)

    console.log('Request rejected')

    return new Response(
      `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2 style="color:red">❌ Доступ отклонён / Access Rejected</h2>
        <p><strong>${accessRequest.email}</strong></p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  return new Response('Invalid action', { status: 400 })
}
