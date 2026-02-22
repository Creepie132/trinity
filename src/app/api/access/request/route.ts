import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== ACCESS REQUEST START ===')
    console.log('User ID:', user.id)
    console.log('User email:', user.email)

    // Check if there's already a pending request
    const { data: existingRequest } = await supabaseAdmin
      .from('access_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      console.log('Existing pending request found:', existingRequest.id)
      return NextResponse.json({
        success: true,
        requestId: existingRequest.id,
        message: 'Access request already exists',
      })
    }

    // Create new access request
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('access_requests')
      .insert({
        user_id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log('New request created:', newRequest.id)

    // Send notification to admin via Telegram
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ambersol.co.il'

    if (TELEGRAM_BOT_TOKEN && ADMIN_CHAT_ID) {
      try {
        // Generate simple review token
        const reviewToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
        
        const approveUrl = `${APP_URL}/api/access/review?user_id=${user.id}&action=approve&token=${reviewToken}`
        const rejectUrl = `${APP_URL}/api/access/review?user_id=${user.id}&action=reject&token=${reviewToken}`

        const message = [
          '🔐 Новый запрос на доступ!',
          '',
          `👤 ${user.user_metadata?.full_name || 'Без имени'}`,
          `📧 ${user.email}`,
          `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Jerusalem' })}`,
          '',
          `✅ Одобрить: ${approveUrl}`,
          `❌ Отклонить: ${rejectUrl}`,
        ].join('\n')

        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: message,
              disable_web_page_preview: true,
            }),
          }
        )

        if (!telegramResponse.ok) {
          console.error('Telegram notification failed:', await telegramResponse.text())
        } else {
          console.log('Telegram notification sent successfully')
        }
      } catch (telegramError) {
        console.error('Error sending Telegram notification:', telegramError)
        // Don't fail the request if notification fails
      }
    } else {
      console.log('Telegram bot not configured, skipping notification')
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      message: 'Access request submitted',
    })
  } catch (error: any) {
    console.error('=== ACCESS REQUEST ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
