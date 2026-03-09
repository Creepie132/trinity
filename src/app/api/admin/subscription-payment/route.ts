import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { resend } from '@/lib/resend'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ambersol.co.il'

/**
 * POST /api/admin/subscription-payment
 * Создаёт ссылку на первый платёж подписки и отправляет email клиенту
 * 
 * Body: { org_id, amount, billing_due_date }
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  try {
    const { org_id, amount, billing_due_date } = await request.json()

    if (!org_id || !amount) {
      return NextResponse.json(
        { error: 'org_id and amount are required' },
        { status: 400 }
      )
    }

    // Получаем организацию с email владельца
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id, 
        name, 
        features,
        org_users!inner (
          email,
          role
        )
      `)
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Находим email владельца
    const ownerEmail = org.org_users?.find((u: any) => u.role === 'owner')?.email 
      || org.features?.business_info?.email

    if (!ownerEmail) {
      return NextResponse.json(
        { error: 'No owner email found for organization' },
        { status: 400 }
      )
    }

    // Сохраняем billing_amount и billing_due_date
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        billing_amount: amount,
        billing_due_date: billing_due_date,
        billing_status: 'pending',
      })
      .eq('id', org_id)

    if (updateError) {
      console.error('Failed to update billing info:', updateError)
    }

    // Генерируем ссылку на оплату Tranzila
    const paymentUrl = `https://direct.tranzila.com/ambersolt/iframenew.php?` + 
      new URLSearchParams({
        sum: amount.toString(),
        currency: '1',
        pdesc: `Trinity CRM подписка — ${org.name}`,
        notify_url: `${BASE_URL}/api/webhooks/tranzila`,
        success_url: `${BASE_URL}/payment/success`,
        fail_url: `${BASE_URL}/payment/fail`,
        // Передаём org_id чтобы webhook знал кому сохранить токен
        custom: org_id,
        // Запрашиваем токенизацию карты
        tranzilaTK: '1',
      }).toString()

    // Отправляем email через Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Trinity CRM <notifications@ambersol.co.il>',
      to: ownerEmail,
      subject: 'Оплата подписки Trinity CRM',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Trinity CRM</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 16px 16px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Подключение автоплатежа</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
              Здравствуйте!
            </p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
              Для подключения автоматической оплаты подписки <strong>${org.name}</strong>, 
              пожалуйста, перейдите по ссылке и введите данные вашей карты.
            </p>
            <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 24px 0;">
              Сумма: ₪${amount}/месяц
            </p>
            <a href="${paymentUrl}" 
               style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Оплатить и подключить
            </a>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
              После оплаты ваша карта будет сохранена для автоматических списаний. 
              Вы можете отменить подписку в любой момент.
            </p>
          </div>
        </div>
      `,
    })

    if (emailError) {
      console.error('Failed to send email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email_sent_to: ownerEmail,
      payment_url: paymentUrl,
    })
  } catch (error) {
    console.error('Subscription payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
