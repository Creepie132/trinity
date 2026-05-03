import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { calcProration, PLAN_PRICES } from '@/lib/proration'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/admin/prorate?org_id=...&to_plan=...&to_price=...
 * Превью расчёта — не применяет изменений.
 */
export async function GET(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const orgId   = searchParams.get('org_id')
  const toPlan  = searchParams.get('to_plan')
  const toPrice = searchParams.get('to_price') ? parseFloat(searchParams.get('to_price')!) : undefined

  if (!orgId || !toPlan) {
    return NextResponse.json({ error: 'org_id and to_plan required' }, { status: 400 })
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, plan, billing_amount, billing_due_date, subscription_expires_at, tranzila_card_token, tranzila_card_last4')
    .eq('id', orgId)
    .single()

  if (error || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const billingDate = org.billing_due_date || org.subscription_expires_at || new Date().toISOString()
  const fromPrice   = org.billing_amount ?? PLAN_PRICES[org.plan ?? 'base'] ?? 199
  const preview     = calcProration(org.plan ?? 'base', toPlan, billingDate, fromPrice, toPrice)

  return NextResponse.json({
    preview,
    has_card_token: !!org.tranzila_card_token,
    card_last4:     org.tranzila_card_last4 ?? null,
  })
}

/**
 * POST /api/admin/prorate
 *
 * Создаёт plan_change_request и отправляет email клиенту с запросом подтверждения.
 * Клиент переходит на /plan-change/[token], ставит галочку, подтверждает.
 * Только после подтверждения происходит charge / credit.
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { org_id, to_plan, to_price } = body

  if (!org_id || !to_plan) {
    return NextResponse.json({ error: 'org_id and to_plan required' }, { status: 400 })
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(`
      id, name, plan, billing_amount, billing_due_date,
      subscription_expires_at, owner_email, owner_name,
      tranzila_card_token, tranzila_card_last4,
      org_users!inner (email, role)
    `)
    .eq('id', org_id)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const ownerEmail =
    (org.org_users as any[])?.find((u: any) => u.role === 'owner')?.email ||
    (org as any).owner_email

  const billingDate = (org as any).billing_due_date
    || (org as any).subscription_expires_at
    || new Date().toISOString()
  const fromPrice = (org as any).billing_amount ?? PLAN_PRICES[(org as any).plan ?? 'base'] ?? 199
  const newPrice  = to_price ?? PLAN_PRICES[to_plan] ?? 199

  const preview = calcProration((org as any).plan ?? 'base', to_plan, billingDate, fromPrice, newPrice)

  // Создаём запрос в БД
  const { data: req, error: reqError } = await supabase
    .from('plan_change_requests')
    .insert({
      org_id,
      initiated_by:    'admin',
      from_plan:       preview.fromPlan,
      to_plan:         preview.toPlan,
      from_price:      preview.fromPrice,
      to_price:        preview.toPrice,
      proration_type:  preview.type,
      prorated_amount: preview.proratedAmount,
      credit_amount:   preview.creditAmount,
      days_left:       preview.daysLeft,
      days_in_period:  preview.daysInPeriod,
      billing_date:    billingDate.split('T')[0],
      effective_date:  preview.effectiveDate,
      next_billing_date: preview.nextBillingDate,
      status:          'pending_confirmation',
    })
    .select('id, confirm_token')
    .single()

  if (reqError || !req) {
    console.error('[prorate POST] Failed to create plan_change_request:', reqError)
    return NextResponse.json({ error: 'Failed to create plan change request' }, { status: 500 })
  }

  const confirmUrl = `${BASE_URL}/plan-change/${req.confirm_token}`

  // Отправляем email клиенту
  if (ownerEmail) {
    await resend.emails.send({
      from:    'Trinity CRM <notifications@ambersol.co.il>',
      to:      ownerEmail,
      subject: preview.type === 'upgrade'
        ? `שדרוג מנוי Trinity CRM — ${(org as any).name}`
        : `שינוי מנוי Trinity CRM — ${(org as any).name}`,
      headers: getEmailHeaders(),
      tags:    getEmailTags('transactional'),
      html:    buildConfirmationEmail({
        orgName:  (org as any).name,
        preview,
        confirmUrl,
        cardLast4: (org as any).tranzila_card_last4 ?? null,
        hasToken:  !!(org as any).tranzila_card_token,
      }),
    })
  }

  return NextResponse.json({
    ok:          true,
    request_id:  req.id,
    confirm_url: confirmUrl,
    email_sent:  !!ownerEmail,
    preview,
  })
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildConfirmationEmail(p: {
  orgName:   string
  preview:   ReturnType<typeof calcProration>
  confirmUrl: string
  cardLast4: string | null
  hasToken:  boolean
}) {
  const isUpgrade   = p.preview.type === 'upgrade'
  const isDowngrade = p.preview.type === 'downgrade'

  const actionSummary = isUpgrade
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:12px;">
         <span style="color:#64748b;">תוספת חד-פעמית</span>
         <strong style="font-size:20px;color:#059669;">₪${p.preview.proratedAmount}</strong>
       </div>
       ${p.hasToken && p.cardLast4
         ? `<div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#64748b;">יחויב מהכרטיס</span>
              <strong>**** ${p.cardLast4}</strong>
            </div>`
         : `<div style="color:#f59e0b;font-size:13px;padding:8px 12px;background:#fefce8;border-radius:8px;margin-bottom:12px;">
              ⚠️ אין כרטיס שמור — תישלח קישור לתשלום
            </div>`}`
    : isDowngrade
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:12px;">
         <span style="color:#64748b;">זיכוי לחיוב הבא</span>
         <strong style="font-size:20px;color:#6366f1;">₪${p.preview.creditAmount}</strong>
       </div>
       <div style="color:#64748b;font-size:13px;margin-bottom:12px;">
         הזיכוי יקוזז אוטומטית מהחיוב ב-${p.preview.nextBillingDate}
       </div>`
    : ''

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;direction:rtl;">
  <div style="background:linear-gradient(135deg,#1a237e 0%,#283593 50%,#3949ab 100%);padding:32px;border-radius:16px 16px 0 0;text-align:right;">
    <h1 style="color:white;margin:0;font-size:22px;">Trinity CRM</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">שינוי תוכנית</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border-radius:0 0 16px 16px;">
    <h2 style="color:#1e293b;margin:0 0 8px;">שינוי תוכנית מנוי</h2>
    <p style="color:#64748b;margin:0 0 24px;">${p.orgName}</p>

    <div style="background:white;border-radius:12px;padding:20px;margin:0 0 20px;border:1px solid #e2e8f0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:#64748b;">מהתוכנית</span>
        <strong>${p.preview.fromPlan.toUpperCase()} (₪${p.preview.fromPrice}/חודש)</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:#64748b;">לתוכנית</span>
        <strong style="color:${isUpgrade ? '#059669' : '#6366f1'};">${p.preview.toPlan.toUpperCase()} (₪${p.preview.toPrice}/חודש)</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:#64748b;">ימים שנותרו בתקופה</span>
        <strong>${p.preview.daysLeft} ימים</strong>
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:12px;">
        ${actionSummary}
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">חיוב חודשי מ-${p.preview.nextBillingDate}</span>
          <strong>₪${p.preview.toPrice}/חודש</strong>
        </div>
      </div>
    </div>

    <p style="color:#374151;margin:0 0 20px;font-size:15px;">
      כדי לאשר את השינוי, לחץ על הכפתור למטה ואשר את הפרטים.
    </p>

    <a href="${p.confirmUrl}"
       style="display:block;background:#4f46e5;color:white;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;text-align:center;margin:0 0 16px;">
      ✅ אשר שינוי תוכנית
    </a>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
      הקישור תקף ל-7 ימים. אם לא ביקשת שינוי זה, אנא התעלם מהאימייל.
    </p>
  </div>
</div>`
}
