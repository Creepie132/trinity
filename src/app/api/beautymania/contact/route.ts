import { NextRequest, NextResponse } from 'next/server'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'
import { z } from 'zod'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://beautymania.co.il',
  'https://www.beautymania.co.il',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin)
  const allowOrigin = isAllowed ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

// ─── Validation schema ────────────────────────────────────────────────────────
const bmContactSchema = z.object({
  name:    z.string().min(1).max(200),
  email:   z.string().email(),
  subject: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1).max(5000),
})

// ─── Recipient — Aneta's email ────────────────────────────────────────────────
// Change this to Aneta's real email if needed
const ANETA_EMAIL = process.env.BEAUTYMANIA_EMAIL ?? 'anetamarinina@gmail.com'

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    // Rate limiting
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm:${ip}`)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers }
        )
      }
    } catch {
      // ratelimit unavailable — continue silently
    }

    // Parse + validate
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
    }

    const result = bmContactSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errors }, { status: 400, headers })
    }

    const { name, email, subject, message } = result.data
    const subjectLine = subject || 'Общий вопрос'

    await resend.emails.send({
      from: 'Beautymania <notifications@ambersol.co.il>',
      to: ANETA_EMAIL,
      replyTo: email,
      subject: `📩 ${subjectLine} — от ${name}`,
      headers: getEmailHeaders(),
      tags: getEmailTags('transactional'),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#faf6ef;padding:32px;border-radius:8px;border:1px solid #222">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
            <div style="width:8px;height:8px;background:#c9a84c;border-radius:50%"></div>
            <span style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c">beautymania.co.il</span>
          </div>
          <h2 style="color:#faf6ef;margin:0 0 24px;font-size:20px;font-weight:400">Новое сообщение с сайта</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">Имя</td>
            </tr>
            <tr>
              <td style="padding:0 0 16px;font-size:15px;border-bottom:1px solid #1e1e1e">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">Email</td>
            </tr>
            <tr>
              <td style="padding:0 0 16px;border-bottom:1px solid #1e1e1e">
                <a href="mailto:${escapeHtml(email)}" style="color:#c9a84c;font-size:15px">${escapeHtml(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">Тема</td>
            </tr>
            <tr>
              <td style="padding:0 0 16px;font-size:15px;border-bottom:1px solid #1e1e1e">${escapeHtml(subjectLine)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 2px;color:#8a6b28;font-size:11px;letter-spacing:0.12em;text-transform:uppercase">Сообщение</td>
            </tr>
            <tr>
              <td style="padding:0 0 8px;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(message)}</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:11px;color:#333;margin:0">
            Отправлено через <a href="https://beautymania.co.il" style="color:#555">beautymania.co.il</a>
            &nbsp;·&nbsp; Powered by <a href="https://ambersol.co.il" style="color:#555">Amber Solutions</a>
          </p>
        </div>
      `,
    })

    console.log('[Beautymania Contact] Email sent to', ANETA_EMAIL, 'from', email)

    return NextResponse.json({ success: true }, { headers })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Beautymania Contact] Error:', msg)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500, headers }
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
