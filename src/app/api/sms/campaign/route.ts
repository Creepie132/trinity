import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { sendSms } from '@/lib/inforu'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ✅ Проверка авторизации и доступа к фиче "sms"
    const authResult = await checkAuthAndFeature('sms')
    if (!authResult.success) {
      return authResult.response
    }

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const body = await request.json()
    const { name, message, filter_type, filter_value } = body

    // Validation
    if (!name || !message || !filter_type) {
      return NextResponse.json(
        { error: 'name, message, and filter_type are required' },
        { status: 400 }
      )
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message cannot be empty' },
        { status: 400 }
      )
    }

    // Получаем список получателей на основе фильтра
    let recipientsQuery = supabase
      .from('client_summary')
      .select('id, first_name, last_name, phone')
      .eq('org_id', org_id)
      .not('phone', 'is', null)

    if (filter_type === 'single' && filter_value) {
      // Один конкретный клиент
      recipientsQuery = recipientsQuery.eq('id', filter_value)
    } else if (filter_type === 'inactive_days' && filter_value) {
      // Клиенты неактивные N дней
      const daysAgo = parseInt(filter_value)
      if (isNaN(daysAgo) || daysAgo <= 0) {
        return NextResponse.json(
          { error: 'invalid filter_value for inactive_days' },
          { status: 400 }
        )
      }
      const thresholdDate = new Date()
      thresholdDate.setDate(thresholdDate.getDate() - daysAgo)
      recipientsQuery = recipientsQuery.lt('last_visit', thresholdDate.toISOString())
    }
    // filter_type === 'all' — не добавляем фильтров

    const { data: recipients, error: recipientsError } = await recipientsQuery

    if (recipientsError) {
      console.error('Recipients query error:', recipientsError)
      return NextResponse.json(
        { error: 'Failed to fetch recipients' },
        { status: 500 }
      )
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found matching the filter' },
        { status: 400 }
      )
    }

    // Создаём кампанию
    const { data: campaign, error: campaignError } = await supabase
      .from('sms_campaigns')
      .insert([
        {
          org_id,
          name,
          message,
          filter_type,
          filter_value: filter_value || null,
          recipients_count: recipients.length,
          status: 'sending',
        },
      ])
      .select()
      .single()

    if (campaignError) {
      console.error('Campaign creation error:', campaignError)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    // Отправляем SMS
    const phones = recipients.map((r) => r.phone).filter((p) => p)
    const smsRecipients = phones.map((phone) => ({ Phone: phone }))

    const smsResult = await sendSms({ message, recipients: smsRecipients })

    // Подсчитываем успешные и неудачные
    const sent_count = smsResult.results?.filter((r: any) => r.success).length || 0
    const failed_count = smsResult.results?.filter((r: any) => !r.success).length || 0

    // Обновляем кампанию
    await supabase
      .from('sms_campaigns')
      .update({
        sent_count,
        failed_count,
        status: 'completed',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)

    // Сохраняем отдельные сообщения
    if (smsResult.results && smsResult.results.length > 0) {
      const smsMessages = smsResult.results.map((r: any, index: number) => {
        const recipient = recipients.find((rec) => rec.phone === r.phone)
        return {
          org_id,
          campaign_id: campaign.id,
          client_id: recipient?.id || null,
          phone: r.phone,
          message,
          status: r.success ? 'sent' : 'failed',
          error: r.error || null,
          sent_at: r.success ? new Date().toISOString() : null,
        }
      })

      const { error: messagesError } = await supabase
        .from('sms_messages')
        .insert(smsMessages)

      if (messagesError) {
        console.error('Failed to save SMS messages:', messagesError)
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      recipients_count: recipients.length,
      sent_count,
      failed_count,
    })
  } catch (error: any) {
    console.error('SMS campaign error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
