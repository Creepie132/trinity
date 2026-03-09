import { NextRequest, NextResponse } from 'next/server'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { getAuthContext } from '@/lib/auth-helpers'

interface ProposalItem {
  name: string
  quantity: number
  price: number
  total: number
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { to, clientName, items, discount, total } = body as {
      to: string
      clientName: string
      items: ProposalItem[]
      discount: number
      total: number
    }

    if (!to || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate items HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₪${item.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₪${item.total.toFixed(2)}</td>
      </tr>
    `).join('')

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)

    await resend.emails.send({
      from: 'Trinity CRM <notifications@ambersol.co.il>',
      to,
      subject: `הצעת מחיר | Коммерческое предложение - ₪${total.toFixed(2)}`,
      headers: getEmailHeaders(),
      tags: getEmailTags('transactional'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">הצעת מחיר / Коммерческое предложение</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #64748b; margin: 0 0 24px;">
              שלום ${clientName},<br/>
              להלן הצעת מחיר מעודכנת:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 12px; text-align: right;">מוצר / Товар</th>
                  <th style="padding: 12px; text-align: center;">כמות</th>
                  <th style="padding: 12px; text-align: right;">מחיר</th>
                  <th style="padding: 12px; text-align: right;">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 24px; padding: 16px; background: white; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">סכום ביניים / Подитог:</span>
                <span>₪${subtotal.toFixed(2)}</span>
              </div>
              ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;">
                <span>הנחה / Скидка:</span>
                <span>-₪${discount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; padding-top: 12px; border-top: 2px solid #e2e8f0;">
                <span>סה"כ לתשלום / Итого:</span>
                <span style="color: #059669;">₪${total.toFixed(2)}</span>
              </div>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;">
              הצעת מחיר זו בתוקף ל-7 ימים<br/>
              Предложение действительно 7 дней
            </p>
          </div>
          
          <div style="background: #1e293b; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              Trinity CRM | Amber Solutions
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Proposal Email] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
