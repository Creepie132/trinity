import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log('=== REGISTER BUSINESS START ===')
  
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log('No user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('User ID:', user.id)
  console.log('User email:', user.email)

  const body = await request.json()
  const {
    businessName,
    ownerName,
    mobile,
    landline,
    email,
    address,
    city,
    website,
    businessType,
    description,
  } = body

  // Validate required fields
  if (
    !businessName ||
    !ownerName ||
    !mobile ||
    !address ||
    !city ||
    !businessType ||
    !description
  ) {
    console.log('Missing required fields')
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  console.log('Business name:', businessName)
  console.log('Owner name:', ownerName)

  // Check if user already has organization
  const { data: existingOrg } = await supabaseAdmin
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingOrg) {
    console.log('Organization already exists:', existingOrg.org_id)
    return NextResponse.json(
      { error: 'Organization already exists', redirect: '/access-pending' },
      { status: 409 }
    )
  }

  // Generate unique suffix for org name
  const suffix = Math.random().toString(36).substring(2, 6)
  const orgName = `${businessName}_${suffix}`
  console.log('Generated org name:', orgName)

  // Create organization
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: orgName,
      subscription_status: 'none',
      features: {
        business_info: {
          display_name: businessName,
          owner_name: ownerName,
          mobile: mobile,
          landline: landline || null,
          email: email,
          address: address,
          city: city,
          website: website || null,
          business_type: businessType,
          description: description,
        },
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
    console.error('Org creation error:', orgError)
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  console.log('Organization created:', org.id)

  // Link user to organization
  console.log('=== LINKING USER TO ORG ===')
  console.log('user_id:', user.id)
  console.log('org_id:', org.id)
  console.log('email:', email)

  const { data: orgUserResult, error: linkError } = await supabaseAdmin
    .from('org_users')
    .insert({
      user_id: user.id,
      org_id: org.id,
      email: email,
      role: 'owner',
    })
    .select()

  console.log('org_users result:', JSON.stringify(orgUserResult))
  console.log('org_users error:', JSON.stringify(linkError))

  if (linkError) {
    console.error('org_users link error:', linkError)
    // Rollback: delete organization if linking failed
    console.log('Rolling back organization creation...')
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  console.log('User linked to organization successfully')

  // Create access request
  console.log('Creating access request...')
  const { error: reqError } = await supabaseAdmin
    .from('access_requests')
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: ownerName,
      status: 'pending',
    })

  if (reqError) {
    console.error('Access request error:', reqError)
  } else {
    console.log('Access request created')
  }

  // Send Telegram notification to admin
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ambersol.co.il'

  const approveUrl = `${APP_URL}/api/access/review?user_id=${user.id}&action=approve`
  const rejectUrl = `${APP_URL}/api/access/review?user_id=${user.id}&action=reject`

  if (TELEGRAM_BOT_TOKEN && ADMIN_CHAT_ID) {
    console.log('Sending Telegram notification...')
    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text:
              `🔐 Новый запрос на доступ!\n\n` +
              `🏢 ${businessName}\n` +
              `👤 ${ownerName}\n` +
              `📧 ${email}\n` +
              `📱 ${mobile}\n` +
              `📍 ${city}, ${address}\n` +
              `🏷 ${businessType}\n` +
              `💬 ${description}\n\n` +
              `📅 ${new Date().toLocaleString('ru-RU')}`,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Одобрить (14 дней)', url: approveUrl },
                  { text: '❌ Отклонить', url: rejectUrl },
                ],
              ],
            },
          }),
        }
      )

      if (telegramResponse.ok) {
        console.log('Telegram notification sent')
      } else {
        console.error('Telegram error:', await telegramResponse.text())
      }
    } catch (err) {
      console.error('Failed to send Telegram notification:', err)
    }
  } else {
    console.log('Telegram credentials not configured')
  }

  // Send email to admin via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL || 'ambersolutions.systems@gmail.com'

  if (RESEND_API_KEY) {
    console.log('Sending email notification to admin...')
    console.log('Sending invite email to:', ADMIN_EMAIL)
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Trinity CRM <noreply@send.ambersol.co.il>',
          to: ADMIN_EMAIL,
          subject: `🔐 Новый запрос на доступ: ${businessName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">🔐 Новый запрос на доступ</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>🏢 Название бизнеса:</strong> ${businessName}</p>
                  <p><strong>👤 Владелец:</strong> ${ownerName}</p>
                  <p><strong>📧 Email:</strong> ${email}</p>
                  <p><strong>📱 Телефон:</strong> ${mobile}</p>
                  ${landline ? `<p><strong>☎️ Стационарный:</strong> ${landline}</p>` : ''}
                  <p><strong>📍 Адрес:</strong> ${address}, ${city}</p>
                  ${website ? `<p><strong>🌐 Веб-сайт:</strong> <a href="${website}">${website}</a></p>` : ''}
                  <p><strong>🏷 Тип бизнеса:</strong> ${businessType}</p>
                  <p><strong>💬 Описание:</strong> ${description}</p>
                  <p><strong>📅 Дата запроса:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                </div>
                
                <div style="margin: 30px 0;">
                  <a href="${approveUrl}" 
                     style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; 
                            text-decoration: none; border-radius: 6px; margin-right: 10px;">
                    ✅ Одобрить (14 дней)
                  </a>
                  <a href="${rejectUrl}" 
                     style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; 
                            text-decoration: none; border-radius: 6px;">
                    ❌ Отклонить
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Trinity CRM - Управление клиентами и бизнесом
                </p>
              </div>
            </body>
            </html>
          `,
        }),
      })

      const resendResult = await emailResponse.json()
      
      console.log('Email send result:', resendResult)
      console.log('Email error:', resendResult.error)
      console.log('Resend status:', emailResponse.status)

      if (emailResponse.ok) {
        console.log('Email notification sent')
      } else {
        console.error('Resend error:', resendResult)
      }
    } catch (err) {
      console.error('Failed to send email notification:', err)
    }
  } else {
    console.log('Resend API key not configured')
  }

  console.log('=== REGISTER BUSINESS END ===')

  return NextResponse.json({
    success: true,
    orgId: org.id,
    message: 'Organization created successfully',
  })
}
