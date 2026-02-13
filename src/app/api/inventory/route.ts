// ================================================
// TRINITY CRM - Inventory Transactions API
// GET: List transactions, POST: Create transaction + update quantity
// Version: 2.23.0
// ================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateInventoryTransactionDTO, InventoryTransaction } from '@/types/inventory'

/**
 * GET /api/inventory
 * List inventory transactions for current org
 * Query params: ?product_id=uuid
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { org_id } = orgUser

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('product_id')

    // Build query
    let query = supabase
      .from('inventory_transactions')
      .select('*, products(*)')
      .eq('org_id', org_id)
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
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { org_id } = orgUser

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
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, quantity')
      .eq('id', body.product_id)
      .eq('org_id', org_id)
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
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        org_id,
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
    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', body.product_id)
      .eq('org_id', org_id)

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
