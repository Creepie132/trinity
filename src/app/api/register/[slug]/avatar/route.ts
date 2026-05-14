import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

// Public API — no auth. POST /api/register/[slug]/avatar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const phone = formData.get('phone') as string | null

    if (!file || !phone) return NextResponse.json({ error: 'file and phone required' }, { status: 400 })
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Max 3MB' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
      return NextResponse.json({ error: 'Only JPG/PNG/WebP/GIF' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await supabase
      .from('organizations')
      .select('id, registration_enabled')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!org.registration_enabled) return NextResponse.json({ error: 'Disabled' }, { status: 403 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone', normalizePhone(phone))
      .maybeSingle()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const buffer = await file.arrayBuffer()
    const path = `avatars/${org.id}/${client.id}.webp`

    const { error: uploadError } = await supabase.storage
      .from('org-assets')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error('[Avatar upload]', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
    await supabase.from('clients').update({ avatar_url: publicUrl }).eq('id', client.id)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[Avatar API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
