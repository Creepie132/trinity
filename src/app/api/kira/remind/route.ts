import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage } from '@/lib/wa/send'

/**
 * POST /api/kira/remind
 * Отправляет WA-напоминание о долге клиенту из DebtWidget.
 * Вызывается кнопкой "Напомнить" — только owner/admin.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId, orgRole } = auth

  if (orgRole !== 'owner' && orgRole !== 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let saleId: string, phone: string, clientName: string, amount: number
  try {
    const body = await request.json()
    saleId     = body.saleId
    phone      = body.phone
    clientName = body.clientName
    amount     = body.amount
    if (!phone || !saleId) {
      return NextResponse.json({ error: 'saleId and phone required' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Верификация: продажа принадлежит этому org
  const supabase = createSupabaseServiceClient()
  const { data: sale } = await supabase
    .from('sales').select('id').eq('id', saleId).eq('org_id', orgId).single()

  if (!sale) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  }

  const message = `שלום ${clientName}! נשמח אם תסדיר את יתרת החוב בסך ₪${amount}. תודה! 🙏`

  const result = await sendWhatsAppMessage({
    orgId,
    to: phone,
    message,
    softFail: true,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'WhatsApp not configured', provider: result.provider },
      { status: result.provider === 'none' ? 400 : 500 }
    )
  }

  return NextResponse.json({ ok: true, provider: result.provider })
}
