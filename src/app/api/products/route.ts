// ================================================
// TRINITY CRM - Products API
// GET: List products, POST: Create product
// Version: 2.23.0
// ================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateProductDTO, Product } from '@/types/inventory'

/**
 * GET /api/products
 * List all products for current org
 * Query params: ?search=text
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

    // Parse search query
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('products')
      .select('*')
      .eq('org_id', org_id)
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
    const body: CreateProductDTO = await request.json()

    // Validate required fields
    if (!body.name || !body.sell_price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sell_price' },
        { status: 400 }
      )
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        org_id,
        name: body.name,
        description: body.description,
        barcode: body.barcode,
        sku: body.sku,
        category: body.category,
        purchase_price: body.purchase_price,
        sell_price: body.sell_price,
        quantity: body.quantity || 0,
        min_quantity: body.min_quantity || 0,
        unit: body.unit || 'יחידה',
        image_url: body.image_url,
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
