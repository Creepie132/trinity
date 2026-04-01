import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createHmac } from 'crypto'

/**
 * POST /api/webhooks/products-updated
 * Вызывается Supabase Database Webhook при изменении таблицы products
 * для org_id Beautymania — инвалидирует кэш /api/beautymania/products.
 *
 * Защита: HMAC-SHA256 подпись через PRODUCTS_WEBHOOK_SECRET
 */

const WEBHOOK_SECRET = process.env.PRODUCTS_WEBHOOK_SECRET ?? ''
const BM_ORG_ID      = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Проверяем подпись если секрет задан
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature') ?? ''
      const expected  = createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')
      if (signature !== expected) {
        console.warn('[products-webhook] Invalid signature')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    let payload: { record?: { org_id?: string }; old_record?: { org_id?: string } }
    try { payload = JSON.parse(rawBody) }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    // Проверяем что изменение касается Beautymania
    const orgId = payload.record?.org_id ?? payload.old_record?.org_id
    if (orgId && orgId !== BM_ORG_ID) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Инвалидируем кэш
    revalidatePath('/api/beautymania/products')

    console.log('[products-webhook] Cache invalidated for Beautymania products')
    return NextResponse.json({ ok: true, invalidated: true })

  } catch (err) {
    console.error('[products-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
