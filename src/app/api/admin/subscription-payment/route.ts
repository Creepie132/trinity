import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { createSubscriptionPaymentUrl } from '@/lib/tranzila'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/admin/subscription-payment
 *
 * Генерирует URL на первый платёж через Tranzila My Billing.
 * После оплаты Tranzila автоматически списывает каждый месяц
 * и шлёт notify_url при каждом списании.
 *
 * Нам не нужны токены карт или CGI-запросы — всё делает Tranzila.
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  try {
    const { org_id, amount } = await request.json()

    if (!org_id || !amount) {
      return NextResponse.json({ error: 'org_id and amount are required' }, { status: 400 })
    }

    // Загружаем организацию
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        features,
        org_users!inner (email, role)
      `)
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const ownerEmail =
      (org.org_users as any[])?.find((u: any) => u.role === 'owner')?.email ||
      (org.features as any)?.business_info?.email

    if (!ownerEmail) {
      return NextResponse.json({ error: 'No owner email found for organization' }, { status: 400 })
    }

    // Сохраняем сумму и статус ожидания
    await supabase
      .from('organizations')
      .update({
        billing_amount: amount,
        billing_status: 'pending',
      })
      .eq('id', org_id)

    // URL-ы для Tranzila callbacks
    const successUrl = `${BASE_URL}/api/payments/tranzila-success?org_id=${org_id}`
    const failUrl    = `${BASE_URL}/api/payments/tranzila-failed`
    const notifyUrl  = `${BASE_URL}/api/payments/tranzila-notify`

    const paymentUrl = createSubscriptionPaymentUrl({
      amount,
      orgId: org_id,
      orgName: (org as any).name || '',
      notifyUrl,
      successUrl,
      failUrl,
    })

    // Отправляем email с ссылкой на оплату
    const { error: emailError } = await resend.emails.send({
      from: 'Trinity CRM <notifications@ambersol.co.il>',
      to: ownerEmail,
      subject: 'Подключение подписки Trinity CRM',
      headers: getEmailHeaders(),
      tags: getEmailTags('transactional'),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:32px;border-radius:16px 16px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">Trinity CRM</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 16px 16px;">
            <h2 style="color:#1e293b;margin:0 0 16px;">Подключение автоплатежа</h2>
            <p style="color:#64748b;font-size:16px;line-height:1.6;">Здравствуйте!</p>
            <p style="color:#64748b;font-size:16px;line-height:1.6;">
              Для подключения автоматической оплаты подписки <strong>${(org as any).name}</strong>,
              пожалуйста, перейдите по ссылке и введите данные вашей карты.
            </p>
            <p style="color:#1e293b;font-size:18px;font-weight:600;margin:24px 0;">Сумма: ₪${amount}/месяц</p>
            <a href="${paymentUrl}"
               style="display:inline-block;background:#4F46E5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
              Оплатить и подключить
            </a>
            <p style="color:#94a3b8;font-size:14px;margin-top:32px;">
              После оплаты подписка будет активирована автоматически.
              Следующие списания будут проходить каждый месяц без вашего участия.
            </p>
          </div>
        </div>
      `,
    })

    if (emailError) {
      console.error('[subscription-payment] Email error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', details: emailError }, { status: 500 })
    }

    console.log('[subscription-payment] Link sent to:', ownerEmail)

    return NextResponse.json({
      success: true,
      email_sent_to: ownerEmail,
      payment_url: paymentUrl,
    })
  } catch (error: any) {
    console.error('[subscription-payment] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
