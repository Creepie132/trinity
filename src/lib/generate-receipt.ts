interface ReceiptData {
  payment: {
    id: string
    amount: number
    currency?: string
    payment_method: string | null
    transaction_id: string | null
    paid_at: string | null
    created_at: string
    status: string
  }
  client: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
  } | null
  orgName: string
  description?: string
  locale?: 'he' | 'ru'
}

export function generateReceipt(data: ReceiptData): string {
  const { payment, client, orgName, description, locale = 'he' } = data
  const isRTL = locale === 'he'

  // Translations
  const t = {
    he: {
      receipt: 'קבלה',
      receiptNumber: 'מספר קבלה',
      paymentDate: 'תאריך תשלום',
      client: 'לקוח',
      service: 'שירות / תיאור',
      amount: 'סכום',
      paymentMethod: 'אמצעי תשלום',
      transactionId: 'מזהה עסקה',
      thankYou: 'תודה על התשלום',
      methods: {
        cash: 'מזומן',
        credit_card: 'כרטיס אשראי',
        card: 'כרטיס אשראי',
        bank_transfer: 'העברה בנקאית',
        transfer: 'העברה בנקאית',
        bit: 'ביט',
        phone_credit: 'זיכוי טלפוני',
        other: 'אחר'
      }
    },
    ru: {
      receipt: 'Квитанция',
      receiptNumber: 'Номер квитанции',
      paymentDate: 'Дата оплаты',
      client: 'Клиент',
      service: 'Услуга / Описание',
      amount: 'Сумма',
      paymentMethod: 'Способ оплаты',
      transactionId: 'ID транзакции',
      thankYou: 'Спасибо за оплату',
      methods: {
        cash: 'Наличные',
        credit_card: 'Кредитная карта',
        card: 'Кредитная карта',
        bank_transfer: 'Банковский перевод',
        transfer: 'Банковский перевод',
        bit: 'Bit',
        phone_credit: 'Телефонный кредит',
        other: 'Другое'
      }
    }
  }

  const text = t[locale]

  // Format client name
  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || '—'
    : '—'

  // Format phone
  const clientPhone = client?.phone || ''

  // Receipt number (first 8 chars of payment ID)
  const receiptNumber = payment.id.slice(0, 8).toUpperCase()

  // Format date
  const paymentDate = payment.paid_at || payment.created_at
  const formattedDate = new Date(paymentDate).toLocaleString(
    locale === 'he' ? 'he-IL' : 'ru-RU',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  )

  // Payment method label
  const methodKey = payment.payment_method || 'other'
  const paymentMethodLabel = text.methods[methodKey as keyof typeof text.methods] || text.methods.other

  // Amount
  const currency = payment.currency || 'ILS'
  const currencySymbol = currency === 'ILS' ? '₪' : currency
  const amountFormatted = Number(payment.amount).toFixed(2)

  // Description
  const serviceDescription = description || '—'

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${text.receipt} #${receiptNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      background: #f5f5f5;
      padding: 20px;
    }
    
    .receipt {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 30px;
    }
    
    .org-name {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
    }
    
    .receipt-title {
      font-size: 20px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    
    .receipt-number {
      font-size: 16px;
      color: #9ca3af;
      font-family: 'Courier New', monospace;
    }
    
    .details {
      margin-bottom: 30px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .detail-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
    }
    
    .detail-value {
      color: #1f2937;
      font-size: 14px;
      ${isRTL ? 'text-align: left' : 'text-align: right'};
    }
    
    .amount-row {
      background: #f9fafb;
      padding: 24px;
      border-radius: 8px;
      margin: 30px 0;
    }
    
    .amount-row .detail-label {
      font-size: 18px;
      color: #1f2937;
    }
    
    .amount-row .detail-value {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
    }
    
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    
    .thank-you {
      font-size: 18px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .thank-you-hebrew {
      font-size: 18px;
      color: #9ca3af;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .receipt {
        box-shadow: none;
        border-radius: 0;
      }
      
      @page {
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="org-name">${orgName}</div>
      <div class="receipt-title">${text.receipt}</div>
      <div class="receipt-number">${text.receiptNumber}: #${receiptNumber}</div>
    </div>
    
    <div class="details">
      <div class="detail-row">
        <div class="detail-label">${text.paymentDate}</div>
        <div class="detail-value">${formattedDate}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">${text.client}</div>
        <div class="detail-value">${clientName}${clientPhone ? ` · ${clientPhone}` : ''}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">${text.service}</div>
        <div class="detail-value">${serviceDescription}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">${text.paymentMethod}</div>
        <div class="detail-value">${paymentMethodLabel}</div>
      </div>
      
      ${payment.transaction_id ? `
      <div class="detail-row">
        <div class="detail-label">${text.transactionId}</div>
        <div class="detail-value" style="font-family: 'Courier New', monospace;">${payment.transaction_id}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="amount-row">
      <div class="detail-row" style="border: none; padding: 0;">
        <div class="detail-label">${text.amount}</div>
        <div class="detail-value">${currencySymbol}${amountFormatted}</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="thank-you">${text.thankYou}</div>
      <div class="thank-you-hebrew">${locale === 'he' ? 'Thank you for your payment' : 'תודה על התשלום'}</div>
    </div>
  </div>
  
  <script>
    // Auto-print on load for print-friendly version
    if (window.location.search.includes('print=1')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>
  `.trim()

  return html
}
