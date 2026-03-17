import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const { user, orgId } = auth

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Upload to Supabase Storage
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
    const fileName = `${orgId}/${crypto.randomUUID()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await service.storage
      .from('receipts')
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Convert to base64 for Claude Vision
    const base64 = fileBuffer.toString('base64')
    const mediaType = (file.type === 'image/heic' ? 'image/jpeg' : file.type) as
      'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `You are an expense receipt parser. Extract data from this receipt.
The receipt may be in Hebrew, Russian, or English. Ignore lines with 0.00 amount.
Return ONLY valid JSON with no markdown or backticks:
{
  "vendor": "store name as written",
  "amount": total_number_or_null,
  "currency": "ILS",
  "expense_date": "YYYY-MM-DD or null",
  "category": "supplies|food|transport|utilities|equipment|marketing|rent|salary|other",
  "description": "brief description",
  "confidence": 0.0_to_1.0
}`,
          },
        ],
      }],
    })

    const rawText = claudeResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    } catch {
      console.error('Claude parse error:', rawText)
      parsed = { vendor: null, amount: null, currency: 'ILS', expense_date: null, category: 'other', confidence: 0 }
    }

    const { data: urlData } = service.storage.from('receipts').getPublicUrl(fileName)

    const { data: expense, error: dbError } = await service
      .from('expenses')
      .insert({
        org_id: orgId,
        created_by: user.id,
        vendor: parsed.vendor ?? null,
        amount: parsed.amount ?? null,
        currency: (parsed.currency as string) ?? 'ILS',
        expense_date: parsed.expense_date ?? null,
        category: (parsed.category as string) ?? 'other',
        description: parsed.description ?? null,
        receipt_url: urlData.publicUrl,
        receipt_storage_path: uploadData.path,
        parsed_raw: parsed,
        confidence: parsed.confidence ?? null,
        verified: false,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
    }

    return NextResponse.json({ expense, parsed })
  } catch (err) {
    console.error('Parse route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
