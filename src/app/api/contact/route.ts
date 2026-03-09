import { NextRequest, NextResponse } from 'next/server'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'
import { validateBody, contactFormSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // ✅ Rate limiting (Upstash)
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    } catch (e) {
      console.warn('Rate limiting unavailable:', e)
    }

    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error } = validateBody(contactFormSchema, body)
    if (error || !data) {
      return NextResponse.json({ error: error || 'Validation failed' }, { status: 400 })
    }

    const { name, phone, email, message } = data

    // Send email
    await resend.emails.send({
      from: 'Trinity CRM <notifications@ambersol.co.il>',
      to: 'ambersolutions.systems@gmail.com',
      subject: `פנייה חדשה מ-${name}`,
      headers: getEmailHeaders(),
      tags: getEmailTags('transactional'),
      html: `
        <h2>פנייה חדשה מהאתר</h2>
        <p><strong>שם:</strong> ${name}</p>
        <p><strong>טלפון:</strong> ${phone}</p>
        <p><strong>אימייל:</strong> ${email || 'לא צוין'}</p>
        <p><strong>הודעה:</strong> ${message || 'אין הודעה'}</p>
      `,
    })

    console.log('[Contact Form] Email sent successfully for:', name)

    return NextResponse.json({ 
      success: true,
      message: 'ההודעה נשלחה בהצלחה!',
      messageRu: 'Сообщение отправлено!'
    })
  } catch (error: any) {
    console.error('[Contact Form] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        errorHe: 'שגיאה בשליחת ההודעה',
        errorRu: 'Ошибка при отправке',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
