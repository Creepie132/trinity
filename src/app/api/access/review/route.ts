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

    if (orgUser) {
      // Activate trial
      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          trial_started_at: new Date().toISOString(),
        })
        .eq('id', orgUser.org_id)

      console.log('Trial activated for org:', orgUser.org_id)
    }

    return new Response(
      `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2 style="color:green">✅ Доступ одобрен / Access Approved</h2>
        <p><strong>${accessRequest.email}</strong> получил доступ на 14 дней</p>
        <p>До: ${expiresAt.toLocaleDateString('ru-RU', { timeZone: 'Asia/Jerusalem' })}</p>
        <p>Until: ${expiresAt.toLocaleDateString('en-US', { timeZone: 'Asia/Jerusalem' })}</p>
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
