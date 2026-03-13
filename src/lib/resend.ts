import { Resend } from 'resend'
import crypto from 'crypto'

// Use a placeholder key if RESEND_API_KEY is missing (for build-time)
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build')

// Стандартные заголовки для улучшения deliverability
export function getEmailHeaders() {
  return {
    'X-Entity-Ref-ID': crypto.randomUUID(),
  }
}

// Стандартные теги
export function getEmailTags(category: string = 'transactional') {
  return [
    { name: 'category', value: category }
  ]
}

// ─── Приветственное письмо после активации подписки ─────────────────────────

export interface SubscriptionWelcomeEmailParams {
  toEmail: string
  orgName: string
  amount: number
  nextBillingDate: string      // YYYY-MM-DD
  invoiceUrl?: string          // ссылка на квитанцию от Tranzila (если удалось создать)
  cardLast4?: string | null
}

export async function sendSubscriptionWelcomeEmail(params: SubscriptionWelcomeEmailParams) {
  const { toEmail, orgName, amount, nextBillingDate, invoiceUrl, cardLast4 } = params

  const formattedDate = new Date(nextBillingDate).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const invoiceBlock = invoiceUrl
    ? `<p style="margin:24px 0 0">
        <a href="${invoiceUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          📄 הורד קבלה / Download Receipt
        </a>
       </p>`
    : ''

  const cardBlock = cardLast4
    ? `<p style="color:#6b7280;font-size:14px;margin:8px 0 0">כרטיס: ****${cardLast4}</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:40px 40px 32px;text-align:center">
            <div style="font-size:48px;margin-bottom:12px">🎉</div>
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700">ברוכים הבאים ל-Trinity CRM!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">המנוי שלכם הופעל בהצלחה</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="color:#111827;font-size:16px;margin:0 0 24px;line-height:1.6">
              שלום <strong>${orgName}</strong>,<br>
              תודה על הצטרפותכם ל-Trinity CRM! המנוי שלכם פעיל ומוכן לשימוש.
            </p>

            <!-- Payment box -->
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:20px 24px;margin-bottom:24px">
              <p style="margin:0 0 4px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:.5px">פרטי תשלום</p>
              <p style="margin:0;font-size:28px;font-weight:700;color:#111827">₪${amount.toFixed(2)}</p>
              ${cardBlock}
              <p style="margin:12px 0 0;font-size:14px;color:#6b7280">חידוש הבא: <strong style="color:#374151">${formattedDate}</strong></p>
            </div>

            ${invoiceBlock}

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">

            <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6">
              לכל שאלה פנו אלינו בכתובת
              <a href="mailto:support@ambersol.co.il" style="color:#7c3aed">support@ambersol.co.il</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="color:#9ca3af;font-size:12px;margin:0">Trinity CRM — Amber Solutions © ${new Date().getFullYear()}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from: 'Trinity CRM <noreply@ambersol.co.il>',
      to: toEmail,
      subject: `🎉 המנוי שלך ב-Trinity CRM הופעל! | ${orgName}`,
      html,
      headers: getEmailHeaders(),
      tags: getEmailTags('subscription'),
    })
    console.log('[email] Subscription welcome sent to:', toEmail)
  } catch (err) {
    // Не блокируем основной поток — письмо вторично
    console.error('[email] Failed to send subscription welcome:', err)
  }
}
