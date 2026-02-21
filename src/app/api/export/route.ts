import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireOrgRole, authErrorResponse } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

type ExportType = 'clients' | 'visits' | 'payments' | 'products'
type ExportFormat = 'csv' | 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') as ExportType
    const org_id = searchParams.get('org_id')
    const format = (searchParams.get('format') || 'csv') as ExportFormat
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    // Validation
    if (!type || !org_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, org_id' },
        { status: 400 }
      )
    }

    if (!['clients', 'visits', 'payments', 'products'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: clients, visits, payments, or products' },
        { status: 400 }
      )
    }

    // ✅ Проверка роли (только owner/moderator)
    let userId: string
    let userEmail: string
    try {
      const auth = await requireOrgRole(org_id, ['owner', 'moderator'])
      userId = auth.userId
      userEmail = auth.email
    } catch (e) {
      return authErrorResponse(e)
    }

    // Fetch data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let data: any[] = []
    let filename = `${type}_export_${new Date().toISOString().split('T')[0]}`

    // Загрузка данных по типу
    if (type === 'clients') {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, date_of_birth, created_at')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      data = clients.map((c) => ({
        ID: c.id,
        'First Name': c.first_name,
        'Last Name': c.last_name,
        Phone: c.phone,
        Email: c.email || '',
        'Date of Birth': c.date_of_birth || '',
        'Created At': new Date(c.created_at).toLocaleString(),
      }))
    } else if (type === 'visits') {
      let query = supabase
        .from('visits')
        .select(`
          scheduled_at,
          service_type,
          service_id,
          price,
          status,
          clients!inner(first_name, last_name, org_id)
        `)
        .eq('clients.org_id', org_id)
        .order('scheduled_at', { ascending: false })

      if (date_from) query = query.gte('scheduled_at', date_from)
      if (date_to) query = query.lte('scheduled_at', date_to)

      const { data: visits, error } = await query

      if (error) throw error

      data = visits.map((v: any) => ({
        Date: new Date(v.scheduled_at).toLocaleString(),
        Client: `${v.clients.first_name} ${v.clients.last_name}`,
        Service: v.service_type || v.service_id || '',
        Amount: v.price || 0,
        Status: v.status,
      }))
    } else if (type === 'payments') {
      let query = supabase
        .from('payments')
        .select(`
          amount,
          currency,
          status,
          payment_method,
          paid_at,
          created_at,
          clients!inner(first_name, last_name, org_id)
        `)
        .eq('clients.org_id', org_id)
        .order('created_at', { ascending: false })

      if (date_from) query = query.gte('created_at', date_from)
      if (date_to) query = query.lte('created_at', date_to)

      const { data: payments, error } = await query

      if (error) throw error

      data = payments.map((p: any) => ({
        Amount: p.amount,
        Currency: p.currency,
        Status: p.status,
        'Payment Method': p.payment_method || '',
        'Paid At': p.paid_at ? new Date(p.paid_at).toLocaleString() : '',
        Client: `${p.clients.first_name} ${p.clients.last_name}`,
        'Created At': new Date(p.created_at).toLocaleString(),
      }))
    } else if (type === 'products') {
      const { data: products, error } = await supabase
        .from('products')
        .select('name, barcode, sku, category, sell_price, quantity')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      data = products.map((p) => ({
        Name: p.name,
        Barcode: p.barcode || '',
        SKU: p.sku || '',
        Category: p.category || '',
        Price: p.sell_price || 0,
        Stock: p.quantity || 0,
      }))
    }

    // Generate file
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, type)

    let fileData: string | ArrayBuffer
    let contentType: string
    let fileExtension: string

    if (format === 'xlsx') {
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      fileData = buffer
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      fileExtension = 'xlsx'
    } else {
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      fileData = csv
      contentType = 'text/csv; charset=utf-8'
      fileExtension = 'csv'
    }

    // ✅ Audit log
    await logAudit({
      org_id,
      user_id: userId,
      user_email: userEmail,
      action: 'export',
      entity_type: type,
      new_data: { count: data.length, format, date_from, date_to },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    })

    // Return file
    return new Response(fileData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${fileExtension}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    )
  }
}
