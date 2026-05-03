import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const supabase = createSupabaseServiceClient()

/**
 * POST /api/client-self-edit/avatar
 * FormData: { file: Blob (WebP), client_id: string }
 * Публичный endpoint — загружает аватар в Storage, возвращает публичный URL.
 * Безопасность: client_id проверяется через наличие активного токена.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob | null
    const clientId = formData.get('client_id') as string | null

    if (!file || !clientId) {
      return NextResponse.json({ error: 'file and client_id are required' }, { status: 400 })
    }

    // Проверяем что для этого client_id есть активный токен (защита от abuse)
    const { data: activeToken } = await supabase
      .from('client_edit_tokens')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!activeToken) {
      return NextResponse.json({ error: 'No active token for this client' }, { status: 403 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `${clientId}.webp`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[avatar upload] error:', uploadErr)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = publicUrlData.publicUrl

    // Обновляем avatar_url сразу (так PATCH может пропустить это поле)
    await supabase
      .from('clients')
      .update({ avatar_url: publicUrl })
      .eq('id', clientId)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[avatar upload] unexpected:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
