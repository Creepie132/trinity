import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Return all org_ids in the same branch family as the given orgId
async function getRelatedOrgIds(orgId: string): Promise<string[]> {
  // Is current org a branch child?
  const { data: parentRows } = await supabaseAdmin
    .from('branches')
    .select('parent_org_id')
    .eq('child_org_id', orgId)

  const rootOrgId: string = parentRows?.[0]?.parent_org_id ?? orgId

  // All children of the root org
  const { data: childRows } = await supabaseAdmin
    .from('branches')
    .select('child_org_id')
    .eq('parent_org_id', rootOrgId)
    .eq('is_active', true)

  const ids = new Set<string>([orgId, rootOrgId])
  childRows?.forEach((r) => ids.add(r.child_org_id))
  return Array.from(ids)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search')?.trim() || ''

    // Resolve all org IDs in the branch family for shared client access
    const relatedOrgIds = await getRelatedOrgIds(orgId)

    // Build query
    let query = supabaseAdmin
      .from('clients')
      .select('*')
      .in('org_id', relatedOrgIds)
      .order('created_at', { ascending: false })

    // Фильтрация по поиску — ищем по имени, фамилии, телефону, email
    // Каждое слово ищется отдельно (чтобы "Влад Халфин" нашло Владислав Халфин)
    if (search) {
      const words = search.split(/\s+/).filter(Boolean)
      for (const word of words) {
        const term = `%${word}%`
        query = query.or(
          `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`
        )
      }
    }

    const { data: clients, error: clientsError } = await query

    if (clientsError) {
      console.error('Clients fetch error:', clientsError)
      return NextResponse.json(
        { error: `Database error: ${clientsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(clients, { status: 200 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    // Parse request body
    const body = await req.json()

    const clientData = {
      ...body,
      first_name: body.first_name || body.name?.split(' ')[0] || '',
      last_name: body.last_name || body.name?.split(' ').slice(1).join(' ') || '',
      org_id: orgId,
    }
    delete clientData.name

    // Insert client using admin client (bypasses RLS)
    const { data: client, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: String(insertError) }, { status: 500 })
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
