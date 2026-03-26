import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/visits/[id]/products
 * Add product to visit: add to visit_services for display, update visit price.
 * 
 * ⚠️ IMPORTANT: Does NOT create inventory_transaction or decrement stock here.
 * Stock is decremented only when the visit is completed and payment is confirmed
 * via SaleModal → /api/sales → /api/inventory flow.
 * Previous behaviour (decrement on add) caused premature stock deduction
 * even when the user cancelled the payment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: visitId } = await params

    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const { product_id } = await request.json()
    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 })
    }

    // Fetch product
    const { data: product, error: productError } = await serviceSupabase
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

    // Insert into visit_services for display (product_id stored for later inventory deduction)
    // duration_minutes=0 + service_id=null marks this as a product entry
    const { data: visitServiceEntry, error: vsError } = await serviceSupabase
      .from('visit_services')
      .insert({
        visit_id: visitId,
        service_id: null,
        service_name: product.name,
        service_name_ru: product.name,
        price: product.sell_price || 0,
        duration_minutes: 0,
      })
      .select()
      .single()

    if (vsError) {
      return NextResponse.json({ error: vsError.message }, { status: 500 })
    }

    // NOTE: We do NOT update visits.price here.
    // visits.price stores the BASE service price (set at visit creation, immutable).
    // The full total is computed dynamically in the UI as: visit.price + sum(visit_services.price).
    // Updating visits.price here caused double-counting in the UI and data corruption on refetch.

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        price: product.sell_price,
        visitServiceId: visitServiceEntry?.id,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/visits/[id]/products exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
