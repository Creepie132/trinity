import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const AMBER_ORG = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const BUCKET = 'landing-screenshots'

// POST /api/admin/landing-screenshot
// Body: FormData { slot: "1"|"2"|"3"|"4", file: File }
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    if (auth.orgId !== AMBER_ORG && auth.mainOrgId !== AMBER_ORG) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const slot = formData.get('slot') as string
    const file = formData.get('file') as File | null

    if (!slot || !['1','2','3','4'].includes(slot)) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
    }
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate type & size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max 5MB' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `screenshot-${slot}.${ext}?t=${Date.now()}`
    const storagePath = `screenshot-${slot}.${ext}`

    // Upload (upsert — replace existing)
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[landing-screenshot] upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = service.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

    // Update pricing_config
    const { data: cfg } = await service
      .from('pricing_config').select('id, landing_screenshots').single()

    if (!cfg) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    const screenshots: any[] = cfg.landing_screenshots || []
    const idx = screenshots.findIndex((s: any) => String(s.slot) === slot)
    if (idx >= 0) {
      screenshots[idx] = { ...screenshots[idx], url: publicUrl }
    } else {
      screenshots.push({ slot: Number(slot), url: publicUrl, alt_he: `צילום מסך ${slot}`, alt_ru: `Скриншот ${slot}` })
    }

    await service.from('pricing_config')
      .update({ landing_screenshots: screenshots, updated_at: new Date().toISOString() })
      .eq('id', cfg.id)

    return NextResponse.json({ url: publicUrl, slot: Number(slot) })
  } catch (err) {
    console.error('[landing-screenshot]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
