// ================================================
// TRINITY CRM - Inventory Transactions API
// GET: List transactions, POST: Create transaction + update quantity
// Version: 2.23.0
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import type { CreateInventoryTransactionDTO, InventoryTransaction } from '@/types/inventory'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/inventory
 * List inventory transactions for current org
 * Query params: ?product_id=uuid
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('product_id')

    // Build query
    let query = serviceSupabase
      .from('inventory_transactions')
      .select('*, products(*)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // Filter by product_id if provided
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('[API] GET /api/inventory error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transactions: transactions || [] })
  } catch (error) {
    console.error('[API] GET /api/inventory exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/inventory
 * Create inventory transaction + update product quantity
 * 
 * Transaction types:
 * - purchase/return: INCREASE quantity
 * - sale/write_off: DECREASE quantity
 * - adjustment: SET quantity to exact value
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    // Parse request body
    const body: CreateInventoryTransactionDTO = await request.json()

    // Validate required fields
    if (!body.product_id || !body.type || body.quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, type, quantity' },
        { status: 400 }
      )
    }

    // Validate transaction type
    const validTypes = ['purchase', 'sale', 'return', 'adjustment', 'write_off']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current product to verify ownership and get current quantity
    const { data: product, error: productError } = await serviceSupabase
      .from('products')
      .select('id, quantity')
      .eq('id', body.product_id)
      .eq('org_id', orgId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Calculate new quantity based on transaction type
    let newQuantity: number

    switch (body.type) {
      case 'purchase':
      case 'return':
        // Increase quantity
        newQuantity = product.quantity + body.quantity
        break

      case 'sale':
      case 'write_off':
        // Decrease quantity
        newQuantity = product.quantity - body.quantity
        if (newQuantity < 0) {
          return NextResponse.json(
            { error: 'Insufficient quantity in stock' },
            { status: 400 }
          )
        }
        break

      case 'adjustment':
        // Set exact quantity
        newQuantity = body.quantity
        break

      default:
        return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    // Create transaction and update product quantity in a single transaction
    // Step 1: Insert transaction
    const { data: transaction, error: transactionError } = await serviceSupabase
      .from('inventory_transactions')
      .insert({
        org_id: orgId,
        product_id: body.product_id,
        type: body.type,
        quantity: body.quantity,
        price_per_unit: body.price_per_unit,
        total_price: body.total_price,
        related_payment_id: body.related_payment_id,
        related_visit_id: body.related_visit_id,
        notes: body.notes,
      })
      .select('*, products(*)')
      .single()

    if (transactionError) {
      console.error('[API] POST /api/inventory - transaction error:', transactionError)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    // Step 2: Update product quantity
    const { error: updateError } = await serviceSupabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', body.product_id)
      .eq('org_id', orgId)

    if (updateError) {
      console.error('[API] POST /api/inventory - update quantity error:', updateError)
      // Transaction created but quantity not updated - this is a problem
      // In production, you'd want to use Supabase's database transactions
      return NextResponse.json(
        { error: 'Transaction created but quantity update failed', transaction },
        { status: 500 }
      )
    }

    return NextResponse.json({ transaction, newQuantity }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/inventory exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
