// ================================================
// TRINITY CRM - Secure Product Image Upload
// POST /api/products/upload-image
//
// Zero Trust: клиент НЕ имеет доступа к Storage.
// orgId читается из JWT / user_active_branch — заголовки клиента игнорируются.
// Путь в Storage: {orgId}/{timestamp}-{random}.{ext} — гарантирует data isolation
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — orgId только с сервера, не из заголовков клиента
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    // 2. Парсинг multipart/form-data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing "file" field in form data' }, { status: 400 })
    }

    // 3. Валидация MIME-типа
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP` },
        { status: 400 }
      )
    }

    // 4. Валидация размера
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 5MB limit` },
        { status: 400 }
      )
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // 5. Читаем как ArrayBuffer (без shell-injection)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 6. Путь изолирован по orgId — межорганизационная изоляция данных
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const ext = file.type === 'image/gif' ? 'gif'
      : file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : 'jpg'
    const filePath = `${orgId}/${timestamp}-${random}.${ext}`

    // 7. Upload через service role (НЕ browser client)
    const serviceSupabase = createSupabaseServiceClient()
    const { error: uploadError } = await serviceSupabase.storage
      .from('inventory')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[API] upload-image storage error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    // 8. Возвращаем публичный URL
    const { data: urlData } = serviceSupabase.storage
      .from('inventory')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/products/upload-image exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
