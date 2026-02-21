import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const clientImportSchema = z.object({
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().optional(),
  phone: z.string().min(1, 'Phone required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  notes: z.string().optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const mappingJson = formData.get('mapping') as string
    const orgId = formData.get('org_id') as string
    const userId = formData.get('user_id') as string | null
    const userEmail = formData.get('user_email') as string

    if (!file || !mappingJson || !orgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const mapping = JSON.parse(mappingJson)

    // Parse file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return NextResponse.json(
        { error: 'File is empty or has no data rows' },
        { status: 400 }
      )
    }

    const headers = rawData[0]
    const dataRows = rawData.slice(1)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get existing phones for duplicate check
    const { data: existingClients } = await supabase
      .from('clients')
      .select('phone')
      .eq('org_id', orgId)

    const existingPhones = new Set(existingClients?.map((c) => c.phone) || [])

    const stats = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || row.every((cell) => !cell)) continue // Skip empty rows

      try {
        // Map row to client object
        const clientData: any = {
          org_id: orgId,
        }

        headers.forEach((header: string, index: number) => {
          const targetField = mapping[header]
          if (targetField && targetField !== 'skip') {
            const value = row[index]
            if (value !== undefined && value !== null && value !== '') {
              clientData[targetField] = String(value).trim()
            }
          }
        })

        // Validate
        const validatedData = clientImportSchema.parse(clientData)

        // Check for duplicate phone
        if (existingPhones.has(validatedData.phone)) {
          stats.skipped++
          continue
        }

        // Parse date_of_birth if provided
        let dobFormatted = null
        if (validatedData.date_of_birth) {
          try {
            const dob = new Date(validatedData.date_of_birth)
            if (!isNaN(dob.getTime())) {
              dobFormatted = dob.toISOString().split('T')[0]
            }
          } catch {
            // Invalid date, skip
          }
        }

        // Insert client
        const { error } = await supabase.from('clients').insert({
          org_id: orgId,
          first_name: validatedData.first_name,
          last_name: validatedData.last_name || '',
          phone: validatedData.phone,
          email: validatedData.email || null,
          address: validatedData.address || null,
          date_of_birth: dobFormatted,
          notes: validatedData.notes || null,
        })

        if (error) throw error

        existingPhones.add(validatedData.phone)
        stats.imported++
      } catch (error: any) {
        stats.errors.push(`Row ${i + 2}: ${error.message}`)
      }
    }

    // Log audit
    await logAudit({
      org_id: orgId,
      user_id: userId ? userId : undefined,
      user_email: userEmail || 'system',
      action: 'import',
      entity_type: 'clients',
      entity_id: orgId,
      new_data: {
        file_name: file.name,
        total_rows: dataRows.length,
        imported: stats.imported,
        skipped: stats.skipped,
        errors_count: stats.errors.length,
      },
    })

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import clients', details: error.message },
      { status: 500 }
    )
  }
}
