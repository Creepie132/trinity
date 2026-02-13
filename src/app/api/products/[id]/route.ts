// ================================================
// TRINITY CRM - Single Product API
// PATCH: Update product, DELETE: Soft delete
// Version: 2.23.0
// ================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateProductDTO } from '@/types/inventory'

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

    // Verify product belongs to user's org
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('org_id', org_id)
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
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('org_id', org_id)
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

    // Soft delete: set is_active = false
    const { data: product, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .eq('org_id', org_id)
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
