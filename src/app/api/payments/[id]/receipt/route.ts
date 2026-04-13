import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createReceipt, getInvoiceDisplayUrl } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/[id]/receipt
 *
 * Возвращает квитанцию Tranzila для платежа.
 *
 * Логика:
 *   1. Если tranzila_document_id уже есть → редирект на Tranzila PDF viewer
 *   2. Если нет → создаём квитанцию через Tranzila Billing API,
 *      сохраняем retrieval_key в payments.tranzila_document_id, редирект
 *   3. Только для completed-платежей
 *
 * Security:
 *   - getAuthContext(request) обязателен
 *   - Суперадмин видит любой платёж, обычный юзер — только своей org
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const service = createSupabaseServiceClient()

    const { data: payment, error: paymentError } = await service
      .from('payments')
      .select(`
        id, amount, payment_method, status, description,
        paid_at, created_at, transaction_id, tranzila_document_id,
        org_id,
        clients:client_id (id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Проверка доступа
    if (!auth.isAdmin && auth.orgId !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Только completed-платежи имеют квитанцию
    if (payment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Receipt is only available for completed payments' },
        { status: 400 }
      )
    }

    // ── Шаг 1: уже есть document_id — редиректим сразу ──────────────────────
    if (payment.tranzila_document_id) {
      const url = getInvoiceDisplayUrl(payment.tranzila_document_id)
      return NextResponse.redirect(url, { status: 302 })
    }

    // ── Шаг 2: создаём квитанцию на лету через Tranzila Billing API ─────────
    const { data: org } = await service
      .from('organizations')
      .select('name, email')
      .eq('id', payment.org_id)
      .single()

    const client = payment.clients as any
    const clientName = client
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || org?.name || 'לקוח'
      : org?.name || 'לקוח'

    const clientEmail: string | undefined =
      client?.email ?? org?.email ?? undefined

    const itemName = payment.description?.trim() || 'תשלום'

    const receipt = await createReceipt({
      clientName,
      clientEmail,
      items: [{ name: itemName, quantity: 1, unit_price: Number(payment.amount) }],
      totalAmount: Number(payment.amount),
      paymentMethod: payment.payment_method ?? 'other',
      terminalName: process.env.TRANZILA_TERMINAL_ID || 'ambersolt',
    })

    // Сохраняем retrieval_key — он используется для display_document
    await service
      .from('payments')
      .update({ tranzila_document_id: receipt.retrievalKey })
      .eq('id', id)

    const url = getInvoiceDisplayUrl(receipt.retrievalKey)
    return NextResponse.redirect(url, { status: 302 })

  } catch (err: any) {
    console.error('[receipt] Error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Failed to generate receipt', details: err?.message },
      { status: 500 }
    )
  }
}
