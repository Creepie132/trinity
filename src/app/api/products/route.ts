// ================================================
// TRINITY CRM - Products API
// GET: List products, POST: Create product
// Version: 2.23.0
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import type { CreateProductDTO, Product } from '@/types/inventory'
import { validateBody, createProductSchema } from '@/lib/validations'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * GET /api/products
 * List all products for current org
 * Query params: ?search=text
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    // Parse search query
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('products')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('[API] GET /api/products error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error('[API] GET /api/products exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/products
 * Create new product
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

    // Parse request body
    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createProductSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    // Используем service role для обхода RLS (auth уже проверена выше)
    const serviceSupabase = createSupabaseServiceClient()

    // Insert product
    const { data: product, error } = await serviceSupabase
      .from('products')
      .insert({
        org_id: orgId,
        name: data.name,
        description: data.description,
        barcode: data.barcode,
        sku: data.sku,
        category: data.category,
        purchase_price: data.purchase_price,
        sell_price: data.sell_price,
        quantity: data.quantity || 0,
        min_quantity: data.min_quantity || 0,
        unit: data.unit || 'יחידה',
        image_url: data.image_url,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] POST /api/products error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/products exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
