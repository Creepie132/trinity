'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendProposalEmailParams {
  toEmail: string
  toName: string
  orgName: string
  proposalNumber: string
  totalAmount: string
  itemsList: string
  pdfLink?: string
  notes?: string
}

export async function sendProposalEmail(params: SendProposalEmailParams) {
  const { toEmail, toName, orgName, proposalNumber, totalAmount, itemsList, pdfLink, notes } = params

  const pdfButtonHtml = pdfLink
    ? `<div style="text-align:center;margin:20px 0">
        <a href="${pdfLink}" style="background:#1B2A4A;color:#D4AA50;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
          📄 הורד הצעת מחיר PDF
        </a>
        <p style="color:#999;font-size:11px;margin-top:8px">הקישור בתוקף ל-3 ימים</p>
      </div>`
    : ''

  const { error } = await resend.emails.send({
    from: `${orgName} <noreply@ambersol.co.il>`,
    to: toEmail,
    subject: `הצעת מחיר #${proposalNumber} מאת ${orgName}`,
    tags: [{ name: 'category', value: 'transactional' }],
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1B2A4A;padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#D4AA50;margin:0;font-size:22px">הצעת מחיר #${proposalNumber}</h1>
        </div>
        <div style="background:#f8f9fb;border:1px solid #e2e6ed;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#333;margin-bottom:16px">שלום ${toName},</p>
          <p style="color:#333;margin-bottom:24px">מצורפת הצעת המחיר שלנו עבורך:</p>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr style="background:#1B2A4A;color:#fff">
                <th style="padding:10px;text-align:right">מוצר</th>
                <th style="padding:10px;text-align:center">כמות</th>
                <th style="padding:10px;text-align:left">מחיר</th>
              </tr>
            </thead>
            <tbody>${itemsList}</tbody>
          </table>
          
          <div style="background:#1B2A4A;color:#fff;padding:12px 16px;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
            <strong>לתשלום:</strong>
            <strong style="color:#D4AA50;font-size:18px">${totalAmount}</strong>
          </div>
          
          ${pdfButtonHtml}
          
          ${notes ? `<p style="margin-top:16px;color:#666;font-size:13px;border-top:1px solid #e2e6ed;padding-top:12px">${notes}</p>` : ''}
          
          <p style="margin-top:24px;color:#999;font-size:12px">
            מופק ע"י Trinity CRM · ${orgName}
          </p>
        </div>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
