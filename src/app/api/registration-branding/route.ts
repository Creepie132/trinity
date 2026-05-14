import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createClient } from '@supabase/supabase-js'

function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !type) return NextResponse.json({ error: 'file and type required' }, { status: 400 })
  if (!['logo', 'photo'].includes(type)) return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5MB' }, { status: 400 })
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
    return NextResponse.json({ error: 'Only JPG/PNG/WebP/GIF' }, { status: 400 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : 'webp'
  const path = `registration/${orgId}/${type}.${ext}`
  const buffer = await file.arrayBuffer()

  const supabase = createSupabaseServiceClient()
  const { error: uploadError } = await supabase.storage
    .from('org-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[Registration upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
  const field = type === 'logo' ? 'registration_logo_url' : 'registration_photo_url'
  await supabase.from('organizations').update({ [field]: publicUrl }).eq('id', orgId)

  return NextResponse.json({ url: publicUrl })
}
