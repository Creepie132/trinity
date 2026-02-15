import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, message } = body

    // Validation
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required', errorHe: 'שם וטלפון הם שדות חובה' },
        { status: 400 }
      )
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send email
    await resend.emails.send({
      from: 'Trinity CRM <noreply@ambersol.co.il>',
      to: 'ambersolutions.systems@gmail.com',
      subject: `פנייה חדשה מ-${name}`,
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
