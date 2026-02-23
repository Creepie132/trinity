import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, message } = await request.json()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  console.log('=== INVITATION CREATE ===')
  console.log('Email:', email)
  console.log('Invited by:', user.email)

  // Check for existing pending invitation
  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already invited' }, { status: 409 })
  }

  // Check if user already exists in system
  const { data: existingUser } = await supabaseAdmin
    .from('org_users')
    .select('user_id, org_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  let warningMessage = null

  if (existingUser) {
    // Check if user is admin
    const { data: existingAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', existingUser.user_id)
      .maybeSingle()

    if (existingAdmin) {
      warningMessage = 'Этот email принадлежит администратору. Приглашение отправлено но не изменит его права.'
      console.log('Warning: Inviting existing admin:', email)
    } else {
      warningMessage = 'Этот пользователь уже в системе. Приглашение отправлено но не изменит его текущий план.'
      console.log('Warning: Inviting existing user:', email)
    }
  }

  // Create invitation
  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      email: email.toLowerCase(),
      invited_by: user.id,
      message: message || null,
    })
    .select('id, token')
    .single()

  if (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ambersol.co.il'
  const inviteUrl = `${APP_URL}/invite/${invitation.token}`

  console.log('Invitation created:', invitation.id)
  console.log('Invite URL:', inviteUrl)

  // Send email via Resend
  console.log('=== RESEND EMAIL START ===')
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
  console.log('Sending to:', email)
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  let emailSent = false

  if (RESEND_API_KEY) {
    try {
      const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff">
  <div style="text-align:center;margin-bottom:30px;padding:20px;background:linear-gradient(135deg,#1B2A4A,#2d4a7a);border-radius:12px">
    <h1 style="color:#ffffff;margin:0;font-size:28px">Trinity CRM</h1>
    <p style="color:#C8922A;font-size:14px;margin:5px 0 0">by Amber Solutions</p>
  </div>
  
  <h2 style="color:#1B2A4A;text-align:center">You've been invited! | !הוזמנת</h2>
  
  ${message ? `<div style="background:#F8F9FC;border-right:4px solid #C8922A;padding:12px 16px;margin:20px 0;border-radius:4px"><p style="color:#64748B;font-style:italic;margin:0">"${message}"</p></div>` : ''}
  
  <p style="color:#334155;line-height:1.6">You're invited to try <b>Trinity CRM</b> — a smart business management system for appointments, clients, and payments. Your free 14-day trial starts when you sign up.</p>
  
  <p style="color:#334155;line-height:1.6;direction:rtl;text-align:right">הוזמנת לנסות את <b>Trinity CRM</b> — מערכת חכמה לניהול תורים, לקוחות ותשלומים. 14 ימי ניסיון חינם מתחילים עם ההרשמה.</p>
  
  <div style="text-align:center;margin:30px 0">
    <a href="${inviteUrl}" style="background:#C8922A;color:white;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:18px;display:inline-block">Accept Invitation | קבל הזמנה</a>
  </div>
  
  <div style="background:#F1F5F9;padding:16px;border-radius:8px;margin-top:30px">
    <p style="color:#64748B;font-size:13px;margin:0;text-align:center">This invitation expires in 7 days | ההזמנה תפוג בעוד 7 ימים</p>
  </div>
  
  <p style="color:#94A3B8;font-size:12px;text-align:center;margin-top:30px">Amber Solutions © 2024</p>
</div>
      `

      const emailPayload = {
        from: 'Trinity CRM <noreply@send.ambersol.co.il>',
        to: email.toLowerCase(),
        subject: 'You are invited to Trinity CRM | הוזמנת ל-Trinity CRM',
        html: emailBody,
      }

      console.log('Email payload:', {
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        htmlLength: emailBody.length
      })

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      })

      const resendResult = await resendRes.json()
      console.log('Resend status:', resendRes.status)
      console.log('Resend result:', JSON.stringify(resendResult))

      if (resendRes.ok) {
        emailSent = true
        console.log('✅ Invitation email sent successfully to:', email)
      } else {
        console.error('❌ Resend API error:', resendResult)
      }
    } catch (emailError) {
      console.error('❌ Error sending invitation email:', emailError)
    }
  } else {
    console.warn('⚠️ RESEND_API_KEY not configured, skipping email')
  }
  
  console.log('=== RESEND EMAIL END ===')
  console.log('Email sent status:', emailSent)

  return NextResponse.json({
    success: true,
    invitationId: invitation.id,
    inviteUrl,
    emailSent,
    warning: warningMessage ? true : false,
    message: warningMessage,
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all invitations (simplified query without JOIN)
  const { data: invitations, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, token, status, message, created_at, accepted_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Load invitations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(invitations || [])
}
