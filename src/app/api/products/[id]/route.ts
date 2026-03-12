// ================================================
// TRINITY CRM - Single Product API
// PATCH: Update product, DELETE: Soft delete
// Version: 2.23.0
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import type { UpdateProductDTO } from '@/types/inventory'
import { getAuthContext, authErrorResponse } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * PATCH /api/products/[id]
 * Update existing product
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const productId = params.id

    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    // Verify product belongs to user's org
    const { data: existingProduct, error: checkError } = await serviceSupabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('org_id', orgId)
      .single()

    if (checkError || !existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Parse request body
    const body: UpdateProductDTO = await request.json()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.barcode !== undefined) updateData.barcode = body.barcode
    if (body.sku !== undefined) updateData.sku = body.sku
    if (body.category !== undefined) updateData.category = body.category
    if (body.purchase_price !== undefined) updateData.purchase_price = body.purchase_price
    if (body.sell_price !== undefined) updateData.sell_price = body.sell_price
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.min_quantity !== undefined) updateData.min_quantity = body.min_quantity
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Update product
    const { data: product, error } = await serviceSupabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] PATCH /api/products/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[API] PATCH /api/products/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete (set is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const productId = params.id

    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    // Soft delete: set is_active = false
    const { data: product, error } = await serviceSupabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[API] DELETE /api/products/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('[API] DELETE /api/products/[id] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
