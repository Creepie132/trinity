import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS
)

// Normalize phone number (remove +972, 0, keep only digits)
function normalizePhone(phone) {
  if (!phone || phone === '0000') return ''
  
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '')
  
  // Remove leading 972 or 0
  if (digits.startsWith('972')) {
    digits = digits.slice(3)
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  
  return digits
}

// Parse date (YYYY-MM-DD)
function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000') return null
  
  try {
    // Try ISO format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return dateStr
      }
    }
  } catch (e) {
    console.error('Failed to parse date:', dateStr, e)
  }
  
  return null
}

async function importClients() {
  console.log('🔍 Finding organization "beautymania"...')
  
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, email')
    .ilike('name', '%beauty%')
    .single()
  
  if (orgError || !org) {
    console.error('❌ Organization "beautymania" not found!')
    console.error('Error:', orgError)
    console.log('\n💡 Available organizations:')
    
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, email')
      .order('name')
    
    allOrgs?.forEach((o) => {
      console.log(`  - ${o.name} (${o.email || 'no email'})`)
    })
    
    return
  }
  
  console.log(`✅ Found organization: ${org.name} (ID: ${org.id})`)
  
  // Read CSV file
  const csvPath = resolve(__dirname, 'clients-beautymania.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })
  
  console.log(`\n📋 Found ${records.length} clients in CSV`)
  
  // Check for existing clients by phone
  const { data: existingClients } = await supabase
    .from('clients')
    .select('phone, first_name, last_name')
    .eq('org_id', org.id)
  
  const existingPhones = new Map(
    existingClients?.map((c) => [c.phone, `${c.first_name} ${c.last_name}`]) || []
  )
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const record of records) {
    const phone = normalizePhone(record.phone)
    
    if (!phone) {
      console.log(`⚠️  Skipping ${record.first_name} ${record.last_name} - no phone`)
      skipped++
      continue
    }
    
    if (existingPhones.has(phone)) {
      console.log(`⚠️  Skipping ${record.first_name} ${record.last_name} - phone ${phone} already exists (${existingPhones.get(phone)})`)
      skipped++
      continue
    }
    
    const { error } = await supabase
      .from('clients')
      .insert({
        org_id: org.id,
        first_name: record.first_name || '',
        last_name: record.last_name || '',
        phone: phone,
        email: record.email || null,
        address: record.address || null,
        date_of_birth: parseDate(record.date_of_birth),
        notes: record.notes || null,
      })
    
    if (error) {
      console.error(`❌ Error importing ${record.first_name} ${record.last_name}:`, error.message)
      errors++
    } else {
      console.log(`✅ Imported: ${record.first_name} ${record.last_name} (${phone})`)
      imported++
      existingPhones.set(phone, `${record.first_name} ${record.last_name}`)
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('\n📊 Import complete!')
  console.log(`  ✅ Imported: ${imported}`)
  console.log(`  ⚠️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`\n🎉 Total clients in beautymania: ${existingPhones.size}`)
}

importClients().catch(console.error)
