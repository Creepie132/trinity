import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { sendSms } from '@/lib/inforu'
import { ratelimitStrict, getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ✅ Проверка авторизации и доступа к фиче "sms"
    const authResult = await checkAuthAndFeature('sms')
    if (!authResult.success) {
      return authResult.response
    }

    // ✅ Rate limiting (Upstash)
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitStrict.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    } catch (e) {
      console.warn('Rate limiting unavailable:', e)
    }

    const { org_id, isAdmin } = authResult.data
    const supabase = await getSupabaseServerClient()

    const body = await request.json()
    const { phones, message, campaign_id } = body

    // Validation
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: 'phones array is required' }, { status: 400 })
    }

    // Security: Limit phones array size (prevent abuse)
    if (phones.length > 100) {
      return NextResponse.json({ 
        error: 'Too many recipients. Maximum 100 phones per request' 
      }, { status: 400 })
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Security: Limit message length (SMS standard)
    if (message.length > 1000) {
      return NextResponse.json({ 
        error: 'Message too long. Maximum 1000 characters' 
      }, { status: 400 })
    }

    // Отправляем SMS
    const recipients = phones.map((phone: string) => ({ Phone: phone }))
    const result = await sendSms({ message, recipients })

    // Сохраняем sms_messages (если указан campaign_id)
    if (campaign_id && result.results) {
      // Берём org_id кампании (источник истины)
      const { data: campaign, error: campErr } = await supabase
        .from('sms_campaigns')
        .select('id, org_id')
        .eq('id', campaign_id)
        .single()

      if (campErr || !campaign?.org_id) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      // Если не админ — запрещаем писать в чужую кампанию
      if (!isAdmin && org_id !== campaign.org_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const smsMessages = result.results.map((r: any) => ({
        org_id: campaign.org_id,
        campaign_id,
        client_id: null,
        phone: r.phone,
        message,
        status: r.success ? 'sent' : 'failed',
        error: r.error || null,
        sent_at: r.success ? new Date().toISOString() : null,
      }))

      const { error: dbError } = await supabase.from('sms_messages').insert(smsMessages)
      if (dbError) console.error('Failed to save SMS messages:', dbError)
    }

    return NextResponse.json({
      success: result.success,
      sent_count: result.results?.filter((r: any) => r.success).length || 0,
      failed_count: result.results?.filter((r: any) => !r.success).length || 0,
      results: result.results,
    })
  } catch (error: any) {
    console.error('SMS send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
