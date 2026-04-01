import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { normalizePhone } from '@/lib/wa/phone'

// ─── GET /api/site-orders/[id] ────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('site_orders')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Попробуем найти клиента по телефону
  let matchedClient = null
  if (data.customer_phone) {
    const phone = data.customer_phone.replace(/\D/g, '')
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, phone')
      .eq('org_id', orgId)
      .or(`phone.ilike.%${phone}%`)
      .limit(1)
    if (clients && clients.length > 0) matchedClient = clients[0]
  }

  return NextResponse.json({ ...data, matched_client: matchedClient })
}

// ─── PATCH /api/site-orders/[id] — обновить статус + WhatsApp клиенту ─────────
// Статусы: new → confirmed → shipped → delivered | cancelled
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  let body: { status?: string; sale_id?: string; client_id?: string; send_wa?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { status, sale_id, client_id, send_wa } = body

  const VALID_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled']
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Получаем текущий заказ (нужен для WhatsApp и возврата стока)
  const { data: order } = await supabase
    .from('site_orders')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Возврат товаров на склад при отмене ───────────────────────────────────
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items: Array<{ product_id: string; quantity: number }> = order.items ?? []
    for (const item of items) {
      if (!item.product_id || !item.quantity) continue
      // Увеличиваем quantity обратно
      const { error: rpcErr } = await supabase.rpc('increment_product_quantity', {
        p_product_id: item.product_id,
        p_org_id:     orgId,
        p_delta:      item.quantity,
      })
      if (rpcErr) {
        console.warn('[site-orders] stock restore failed:', rpcErr.message)
      }
    }
  }

  // ── Обновляем заказ ───────────────────────────────────────────────────────
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status)    update.status    = status
  if (sale_id)   update.sale_id   = sale_id
  if (client_id) update.client_id = client_id

  const { data: updated, error } = await supabase
    .from('site_orders')
    .update(update)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── WhatsApp клиенту при смене статуса ────────────────────────────────────
  const phone = order.customer_phone
  const shouldSendWa = send_wa !== false && phone && status && status !== order.status

  if (shouldSendWa) {
    const normalized = normalizePhone(phone)
    if (normalized) {
      const { data: apiKey } = await supabase.rpc('get_wa_api_key', { p_org_id: orgId })
      if (apiKey) {
        const items: Array<{ product_name: string; quantity: number }> = order.items ?? []
        const itemsLine = items.map((i: any) => `${i.product_name} × ${i.quantity}`).join(', ')
        const customerName = order.customer_name ?? 'Клиент'

        const WA_MESSAGES: Record<string, string> = {
          confirmed: `✅ Заказ подтверждён!\n\nПривет, ${customerName}! Ваш заказ подтверждён и готовится к отправке.\n\n🛍️ ${itemsLine}\n💰 Итого: ₪${Number(order.total_amount).toFixed(0)}\n\nМы уведомим вас, когда заказ будет отправлен. 💛`,
          shipped:   `📦 Заказ отправлен!\n\nПривет, ${customerName}! Ваш заказ в пути.\n\n🛍️ ${itemsLine}\n\nОжидайте в течение 1–3 рабочих дней. По вопросам пишите нам! 💛`,
          delivered: `🎉 Заказ доставлен!\n\nПривет, ${customerName}! Надеемся, вам понравится покупка.\n\n🛍️ ${itemsLine}\n\nБудем рады видеть вас снова в Beautymania! 💛`,
          cancelled: `❌ Заказ отменён\n\nПривет, ${customerName}. К сожалению, ваш заказ (${itemsLine}) был отменён. Если у вас есть вопросы — напишите нам. 💛`,
        }

        const waText = WA_MESSAGES[status]
        if (waText) {
          fetch('https://gate.whapi.cloud/messages/text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              to:   `${normalized}@s.whatsapp.net`,
              body: waText,
            }),
          }).catch(err => console.error('[site-orders PATCH] WhatsApp error:', err))
        }
      }
    }
  }

  return NextResponse.json(updated)
}
