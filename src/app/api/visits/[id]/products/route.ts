import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

/**
 * POST /api/visits/[id]/products
 * Add product to visit: create inventory_transaction, decrement quantity, add price to visit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: visitId } = await params

    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    const { orgId, supabase } = auth

    const { product_id } = await request.json()
    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 })
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sell_price, quantity, is_active')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.is_active || product.quantity <= 0) {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 })
    }

    // Create inventory transaction (sale, quantity: -1)
    const { error: txError } = await supabase
      .from('inventory_transactions')
      .insert({
        org_id: orgId,
        product_id,
        type: 'sale',
        quantity: -1,
        price_per_unit: product.sell_price,
        total_price: product.sell_price,
        related_visit_id: visitId,
      })

    if (txError) {
      console.error('[API] POST /api/visits/[id]/products tx error:', txError)
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // Decrement product quantity
    const { error: qtyError } = await supabase
      .from('products')
      .update({ quantity: product.quantity - 1 })
      .eq('id', product_id)

    if (qtyError) {
      console.error('[API] POST /api/visits/[id]/products qty error:', qtyError)
    }

    // Add sell_price to visit price
    const { data: currentVisit } = await supabase
      .from('visits')
      .select('price')
      .eq('id', visitId)
      .single()

    if (currentVisit) {
      await supabase
        .from('visits')
        .update({ price: (currentVisit.price || 0) + (product.sell_price || 0) })
        .eq('id', visitId)
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        price: product.sell_price,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/visits/[id]/products exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
