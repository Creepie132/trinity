/**
 * POST /api/mobile/onboarding/logo
 * Загрузка логотипа организации (multipart/form-data).
 * Auth: Bearer token.
 * Returns: { url: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'organization-logos'
const MAX_SIZE_MB = 5

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Файл превышает ${MAX_SIZE_MB}MB` }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Допустимы только JPEG, PNG, WebP, GIF' }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${orgId}/logo.${ext}`
    const bytes    = await file.arrayBuffer()

    const service = createSupabaseServiceClient()

    // Загружаем в Storage (upsert — заменяем если уже есть)
    const { error: uploadErr } = await service.storage
      .from(BUCKET)
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert:      true,
      })

    if (uploadErr) {
      console.error('[onboarding/logo] upload error:', uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    // Публичный URL
    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(filePath)
    const url = urlData.publicUrl

    // Сохраняем URL в organizations
    await service
      .from('organizations')
      .update({ logo_url: url })
      .eq('id', orgId)

    return NextResponse.json({ url }, { status: 200 })
  } catch (e: any) {
    console.error('[onboarding/logo]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
