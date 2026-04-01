import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'
import { normalizePhone } from '@/lib/wa/phone'
import { z } from 'zod'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://beautymania.co.il',
  'https://www.beautymania.co.il',
  'https://bm-site-eight.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin)
  const allowOrigin = isAllowed ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

// ─── Config ───────────────────────────────────────────────────────────────────
const BM_ORG_ID     = process.env.BEAUTYMANIA_ORG_ID  ?? '1e77c781-3848-4b16-a623-693de123c6bc'
const ANETA_USER_ID = process.env.BEAUTYMANIA_USER_ID ?? '0be0d9ad-d88e-4e7f-aee2-d2b171e03c58'
const ANETA_EMAIL   = process.env.BEAUTYMANIA_EMAIL   ?? 'anetamarinina@gmail.com'

// ─── Schema ───────────────────────────────────────────────────────────────────
const orderSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1).max(200),
  quantity:   z.coerce.number().int().min(1).max(999).default(1),
  name:       z.string().min(1).max(200),
  email:      z.string().email(),
  phone:      z.string().min(7).max(30).optional().or(z.literal('')),
  message:    z.string().max(2000).optional().or(z.literal('')),
})

// ─── WhatsApp helper ──────────────────────────────────────────────────────────
async function sendWaToClient(
  service: ReturnType<typeof createSupabaseServiceClient>,
  orgId: string,
  phone: string,
  message: string
): Promise<void> {
  try {
    const normalized = normalizePhone(phone)
    if (!normalized) return

    const { data: apiKey } = await service.rpc('get_wa_api_key', { p_org_id: orgId })
    if (!apiKey) return

    await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ to: `${normalized}@s.whatsapp.net`, body: message }),
    })
  } catch (err) {
    // Не-критичная ошибка — логируем, не бросаем
    console.error('[Beautymania Order] WhatsApp send failed:', err)
  }
}

// ─── POST /api/beautymania/order ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    // Rate limit
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-order:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* continue */ }

    // Parse + validate
    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers }) }

    const result = orderSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errors }, { status: 400, headers })
    }

    const { product_id, quantity, name, email, phone, message } = result.data
    const service = createSupabaseServiceClient()

    // ── 1. Verify product: belongs to BM, active, has stock ──────────────────
    const { data: product } = await service
      .from('products')
      .select('id, name, sell_price, quantity')
      .eq('id', product_id)
      .eq('org_id', BM_ORG_ID)
      .eq('is_active', true)
      .gt('quantity', 0)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not available' }, { status: 404, headers })
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 409, headers })
    }

    // product_name берётся из БД — клиент не может подменить
    const product_name = product.name
    const totalPrice = (product.sell_price ?? 0) * quantity

    // ── 2. Списать товар со склада (атомарно через decrement) ─────────────────
    const { error: stockError } = await service
      .from('products')
      .update({ quantity: product.quantity - quantity })
      .eq('id', product_id)
      .eq('org_id', BM_ORG_ID)
      .eq('quantity', product.quantity) // optimistic lock — защита от race condition

    if (stockError) {
      // Оптимистичный лок не прошёл — товар уже выкуплен параллельным запросом
      console.error('[Beautymania Order] Stock update failed (race condition):', stockError)
      return NextResponse.json({ error: 'Product just sold out, please refresh' }, { status: 409, headers })
    }

    // ── 3. Сохранить заказ в site_orders ─────────────────────────────────────
    const { data: siteOrder } = await service
      .from('site_orders')
      .insert({
        org_id:         BM_ORG_ID,
        customer_name:  name,
        customer_phone: phone || null,
        customer_email: email,
        items: [{
          product_id,
          product_name,
          quantity,
          unit_price: product.sell_price ?? 0,
        }],
        total_amount: totalPrice,
        status:       'new',
        notes:        message || null,
        source:       'beautymania',
      })
      .select('id')
      .single()

    // ── 4. Уведомление Анете в Trinity ───────────────────────────────────────
    await service.from('notifications').insert({
      org_id:       BM_ORG_ID,
      user_id:      ANETA_USER_ID,
      type:         'new_order',
      title:        '🛍️ Новый заказ с сайта',
      body:         `${name} — ${product_name} × ${quantity}${phone ? ` · ${phone}` : ''}`,
      link:         '/sales',
      reference_id: siteOrder?.id ?? null,
      is_read:      false,
    })

    // ── 5. WhatsApp клиенту — подтверждение заказа ────────────────────────────
    if (phone) {
      const waMessage =
        `✅ Заказ принят!\n\n` +
        `Привет, ${name}! Ваш заказ в Beautymania получен.\n\n` +
        `🛍️ ${product_name} × ${quantity} = ₪${totalPrice.toFixed(0)}\n\n` +
        `Мы свяжемся с вами в ближайшее время для подтверждения доставки. 💛`
      await sendWaToClient(service, BM_ORG_ID, phone, waMessage)
    }

    // ── 6. Email Анете ────────────────────────────────────────────────────────
    await resend.emails.send({
      from:    'Beautymania <notifications@ambersol.co.il>',
      to:      ANETA_EMAIL,
      replyTo: email,
      subject: `🛍️ Новый заказ: ${product_name} — от ${name}`,
      headers: getEmailHeaders(),
      tags:    getEmailTags('transactional'),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#faf6ef;padding:32px;border-radius:8px;border:1px solid #222">
          <div style="margin-bottom:24px">
            <span style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9a84c">beautymania.co.il — новый заказ</span>
          </div>
          <h2 style="color:#faf6ef;margin:0 0 24px;font-size:20px;font-weight:400">🛍️ ${escapeHtml(product_name)}</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Клиент</td></tr>
            <tr><td style="padding:0 0 14px;font-size:15px;border-bottom:1px solid #1e1e1e">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:10px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Email</td></tr>
            <tr><td style="padding:0 0 14px;border-bottom:1px solid #1e1e1e"><a href="mailto:${escapeHtml(email)}" style="color:#c9a84c;font-size:15px">${escapeHtml(email)}</a></td></tr>
            ${phone ? `
            <tr><td style="padding:10px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Телефон</td></tr>
            <tr><td style="padding:0 0 14px;font-size:15px;border-bottom:1px solid #1e1e1e">${escapeHtml(phone)}</td></tr>` : ''}
            <tr><td style="padding:10px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Заказ</td></tr>
            <tr><td style="padding:0 0 14px;font-size:15px;border-bottom:1px solid #1e1e1e">${escapeHtml(product_name)} × ${quantity} = <strong style="color:#c9a84c">₪${totalPrice.toFixed(0)}</strong></td></tr>
            ${message ? `
            <tr><td style="padding:10px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Комментарий</td></tr>
            <tr><td style="padding:0 0 14px;font-size:15px;white-space:pre-wrap">${escapeHtml(message)}</td></tr>` : ''}
          </table>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:11px;color:#333;margin:0">beautymania.co.il · Amber Solutions</p>
        </div>
      `,
    })

    console.log('[Beautymania Order] Order placed:', product_name, 'qty:', quantity, 'by:', name, '| stock left:', product.quantity - quantity)
    return NextResponse.json({ success: true, order_id: siteOrder?.id }, { headers })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Beautymania Order] Error:', msg)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500, headers })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
