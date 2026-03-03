import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

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

    if (orgUser) {
      // Activate trial for existing organization
      console.log('Activating trial for org:', orgUser.org_id)
      
      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          trial_started_at: new Date().toISOString(),
        })
        .eq('id', orgUser.org_id)

      console.log('Trial activated for org:', orgUser.org_id)
    } else {
      console.error('NO ORG FOUND for user:', userId)
      console.error('User should have completed onboarding first!')
      
      return new Response(
        `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px">
          <h2 style="color:red">❌ Error</h2>
          <p>Organization not found for user. User should complete onboarding first.</p>
          <p>Email: ${accessRequest.email}</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    console.log('=== APPROVE END ===')
    console.log('Expires at:', expiresAt.toISOString())

    // Send welcome email to user
    try {
      await resend.emails.send({
        from: 'Trinity CRM <notifications@ambersol.co.il>',
        to: accessRequest.email,
        subject: 'ברוך הבא ל-Trinity CRM! 🎉',
        html: `
          <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">ברוך הבא ל-Trinity CRM! 🎉</h2>
            <p>שלום ${accessRequest.full_name || accessRequest.email},</p>
            <p>בקשתך לגישה אושרה!</p>
            <p>כעת תוכל להתחבר למערכת ולהתחיל לנהל את העסק שלך.</p>
            <a href="https://www.ambersol.co.il/login" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-size:16px;">
              כניסה למערכת
            </a>
            <p style="margin-top:24px;color:#666;font-size:14px;">
              אם יש לך שאלות, צור קשר: support@ambersol.co.il
            </p>
          </div>
        `,
      })
      console.log('Welcome email sent to user:', accessRequest.email)
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
    }

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
