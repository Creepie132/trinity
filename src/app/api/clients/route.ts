import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { enforceDemoLimit } from '@/lib/demo-limits'
import { dispatchNotification } from '@/lib/dispatch-notification'
import { fireWaTrigger } from '@/lib/wa/fire-trigger'

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
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search')?.trim() || ''

    // Resolve all org IDs in the branch family for shared client access
    const relatedOrgIds = await getRelatedOrgIds(orgId)

    // Build query — visits/sales count для индикатора активности в мобиле
    let query = supabaseAdmin
      .from('clients')
      .select('*, visits(count), sales(count)')
      .in('org_id', relatedOrgIds)
      .order('created_at', { ascending: false })

    // Фильтрация по поиску — ищем по имени, фамилии, телефону, email
    // Каждое слово ищется отдельно (чтобы "Влад Халфин" нашло Владислав Халфин)
    if (search) {
      const words = search.split(/\s+/).filter(Boolean)
      for (const word of words) {
        const escaped = word.replace(/[%_\\]/g, '\\$&')
        const term = `%${escaped}%`
        // NOTE: PostgREST .or() парсит строку как "col.op.value" —
        // % внутри value не экранируется, но ilike в Supabase JS SDK
        // передаёт term как URL query param, поэтому % должен быть в самом term.
        // Используем явный массив для читаемости:
        query = (query as any).or(
          [
            `first_name.ilike.${term}`,
            `last_name.ilike.${term}`,
            `phone.ilike.${term}`,
            `email.ilike.${term}`,
            `description.ilike.${term}`,
          ].join(',')
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

    // Добавляем has_activity — есть хоть один визит или продажа
    const enriched = (clients ?? []).map((c: any) => {
      const visitsCount  = (c.visits  as any[])?.[0]?.count ?? 0
      const salesCount   = (c.sales   as any[])?.[0]?.count ?? 0
      const { visits, sales, ...rest } = c
      return {
        ...rest,
        has_activity: visitsCount > 0 || salesCount > 0,
      }
    })

    return NextResponse.json(enriched, { status: 200 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth

    // ── Demo limit: max 10 clients ────────────────────────────────────────────
    const limitError = await enforceDemoLimit(orgId, 'clients')
    if (limitError) return limitError
    // ─────────────────────────────────────────────────────────────────────────

    // Parse request body
    const body = await req.json()

    const clientData = {
      ...body,
      first_name: body.first_name || body.name?.split(' ')[0] || '',
      last_name: body.last_name || body.name?.split(' ').slice(1).join(' ') || null,
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

    // Dispatch Telegram notification (fire-and-forget)
    void dispatchNotification({
      event_type: 'new_client',
      org_id: orgId,
      payload: {
        title: '👤 לקוח חדש',
        body: `${clientData.first_name ?? ''} ${clientData.last_name ?? ''}`.trim() || 'לקוח חדש',
        url: '/clients',
      },
    })

    // WhatsApp триггер client_added (fire-and-forget)
    if (client.phone) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

      void fireWaTrigger({
        orgId,
        triggerType: 'client_added',
        clientPhone: client.phone,
        vars: {
          client_name: client.first_name ?? '',
          org_name:    org?.name ?? '',
        },
        entityId: client.id,
      })
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
