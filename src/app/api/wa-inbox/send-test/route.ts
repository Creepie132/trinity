import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { sendWhatsAppMessage } from '@/lib/wa/send'

// POST /api/wa-inbox/send-test
// Тестовая отправка сообщения — используется со страницы /settings/whatsapp
// Доступно только owner/admin
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId, orgRole, isAdmin } = auth

  if (!isAdmin && orgRole !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { phone: string; message?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, message = 'Test message from Trinity CRM ✅' } = body
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'phone is required' }, { status: 422 })
  }

  const result = await sendWhatsAppMessage({
    orgId,
    to:       phone.trim(),
    message,
    softFail: true,
  })

  return NextResponse.json({
    ok:        result.ok,
    provider:  result.provider,
    messageId: result.messageId,
    error:     result.error ?? null,
  })
}
