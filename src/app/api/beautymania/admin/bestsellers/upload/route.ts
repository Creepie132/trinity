import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'
const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB — PNG с прозрачностью могут быть крупнее
const ALLOWED_MIME = new Set(['image/png', 'image/webp'])

// POST /api/beautymania/admin/bestsellers/upload
// Загружает кастомное фото слота (PNG/WebP) в Supabase Storage
// Bucket: inventory, папка: bestsellers/{orgId}/
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    if (auth.orgId !== BM_ORG_ID) {
      return NextResponse.json({ error: 'Not authorized for this org' }, { status: 403 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 })
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Только PNG или WebP. Получено: ${file.type}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Файл ${(file.size / 1024 / 1024).toFixed(1)}МБ превышает лимит 8МБ` },
        { status: 400 }
      )
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Файл пустой' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const ext = file.type === 'image/webp' ? 'webp' : 'png'
    const filePath = `bestsellers/${BM_ORG_ID}/${timestamp}-${random}.${ext}`

    const service = createSupabaseServiceClient()
    const { error: uploadError } = await service.storage
      .from('inventory')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Bestsellers Upload] storage error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = service.storage
      .from('inventory')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
  } catch (err) {
    console.error('[Bestsellers Upload] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
