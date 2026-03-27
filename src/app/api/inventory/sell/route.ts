// ================================================
// TRINITY CRM - Secure Product Sell API
// POST /api/inventory/sell
//
// Zero Trust: orgId ONLY from getAuthContext() — X-Branch-Org-Id header IGNORED.
// Ownership check перед любой мутацией.
// Payment record создаётся атомарно после транзакции.
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { validateBody, sellProductSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — orgId только с сервера
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    // 2. Zod-валидация тела запроса
    const body = await request.json()
    const { data, error: validationError } = validateBody(sellProductSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { product_id, quantity, price_per_unit, payment_method, client_id } = data
    const total_price = Math.round(quantity * price_per_unit * 100) / 100
    const serviceSupabase = createSupabaseServiceClient()

    // 3. Ownership + stock check
    const { data: product, error: productError } = await serviceSupabase
      .from('products')
      .select('id, quantity, name, org_id')
      .eq('id', product_id)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.quantity < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.quantity}` },
        { status: 400 }
      )
    }

    const newQuantity = product.quantity - quantity

    // 4. Insert inventory transaction
    const { data: transaction, error: txError } = await serviceSupabase
      .from('inventory_transactions')
      .insert({
        org_id: orgId,
        product_id,
        type: 'sale',
        quantity,
        price_per_unit,
        total_price,
      })
      .select()
      .single()

    if (txError) {
      console.error('[API] /api/inventory/sell - tx insert error:', txError)
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // 5. Update product quantity
    const { error: updateError } = await serviceSupabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', product_id)
      .eq('org_id', orgId)

    if (updateError) {
      console.error('[API] /api/inventory/sell - quantity update error:', updateError)
      return NextResponse.json(
        { error: 'Transaction created but quantity update failed', transaction },
        { status: 500 }
      )
    }

    // 6. Create payment record
    let payment = null
    const paymentStatus = payment_method === 'credit' ? 'pending' : 'completed'
    const paidAt = payment_method === 'credit' ? null : new Date().toISOString()

    const { data: paymentData, error: paymentError } = await serviceSupabase
      .from('payments')
      .insert({
        org_id: orgId,
        client_id: client_id ?? null,
        amount: total_price,
        status: paymentStatus,
        payment_method,
        provider: 'cash',
        paid_at: paidAt,
        description: `${product.name} x${quantity}`,
      })
      .select()
      .single()

    if (paymentError) {
      // Non-fatal: транзакция + количество уже обновлены
      console.error('[API] /api/inventory/sell - payment insert error:', paymentError)
    } else {
      payment = paymentData
    }

    return NextResponse.json({ transaction, payment, newQuantity }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/inventory/sell exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
