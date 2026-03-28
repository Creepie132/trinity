import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/payments/upload-receipt
 * Принимает изображение, сжатое на клиенте (browser-image-compression),
 * загружает в bucket 'payment-receipts' и возвращает signed URL на 7 дней.
 *
 * Zero Trust: orgId только из getAuthContext(), файл изолирован по orgId.
 * Разрешены: jpeg, png, webp, gif — max 5MB (уже сжато до ~1MB на клиенте).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const paymentId = formData.get('payment_id') as string | null
    const slot = formData.get('slot') as string | null // 'front' | 'back' | 'receipt'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only images allowed (jpg, png, webp, gif)' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const ts = Date.now()
    const safeSlot = (slot ?? 'file').replace(/[^a-z0-9_-]/gi, '')
    const folder = paymentId ? `${orgId}/${paymentId}` : `${orgId}/pending`
    const filePath = `${folder}/${safeSlot}_${ts}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from('payment-receipts')
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error('[upload-receipt]', uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(filePath, 604800) // 7 дней

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl, path: filePath })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
