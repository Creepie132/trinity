import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(userEmail: string, orgName: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'Trinity CRM <onboarding@resend.dev>',
      to: userEmail,
      subject: 'ברוכים הבאים ל-Trinity CRM!',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto;">
          <div style="background: #F59E0B; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Trinity CRM</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
            <h2>!שלום</h2>
            <p>קיבלת גישה למערכת Trinity CRM עבור הארגון <strong>${orgName}</strong>.</p>
            <p>כדי להיכנס למערכת, לחצ/י על הכפתור:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://ambersol.co.il/login" style="background: #F59E0B; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 18px; font-weight: bold;">כניסה למערכת</a>
            </div>
            <p>השתמש/י באימייל <strong>${userEmail}</strong> לכניסה דרך Google.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 14px;">Amber Solutions Systems | ambersol.co.il</p>
          </div>
        </div>
      `,
    })
    
    console.log('[Email] ✅ Welcome email sent to:', userEmail)
    return true
  } catch (error: any) {
    // Don't block user creation if email fails
    console.error('[Email] ❌ Failed to send welcome email:', error.message)
    return false
  }
}
