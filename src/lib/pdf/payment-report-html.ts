// payment-report-html.ts
// Генерирует HTML для "סיכום תשלומים" — сводки платежей по диапазону дат

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtIls(n: number): string {
  // С шекелем для обычных строк
  return fmt(n) + '\u00a0₪'
}

export interface PaymentReportItem {
  date: string          // DD/MM/YYYY
  clientName: string
  method: string        // иврит
  amount: number
  description?: string
}

export interface PaymentReportData {
  orgName: string
  orgEmail?: string
  orgPhone?: string
  orgAddress?: string
  logoDataUri?: string
  fromDate: string      // DD/MM/YYYY
  toDate: string        // DD/MM/YYYY
  methods: string[]
  payments: PaymentReportItem[]
  docNumber: string
  issueDate: string
}

const methodColors: Record<string, string> = {
  'מזומן': '#16a34a',
  'ביט':   '#8b5cf6',
  'כרטיס': '#2563eb',
  'העברה': '#d97706',
}

function methodBadge(method: string): string {
  const color = methodColors[method] || '#6b7280'
  return `<span style="display:inline-flex;align-items:center;justify-content:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;line-height:1.4;background:${color}18;color:${color};border:1px solid ${color}40;white-space:nowrap">${method}</span>`
}

export function buildPaymentReportHTML(d: PaymentReportData): string {
  const total = d.payments.reduce((s, p) => s + p.amount, 0)

  // Group by method for summary
  const byMethod: Record<string, { count: number; total: number }> = {}
  for (const p of d.payments) {
    if (!byMethod[p.method]) byMethod[p.method] = { count: 0, total: 0 }
    byMethod[p.method].count++
    byMethod[p.method].total += p.amount
  }

  const summaryRows = Object.entries(byMethod).map(([method, data]) => {
    const color = methodColors[method] || '#6b7280'
    return `
      <tr>
        <td style="padding:8px 12px;text-align:right">${methodBadge(method)}</td>
        <td style="padding:8px 12px;text-align:center;color:#555;font-size:13px">${data.count}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;color:${color};font-size:13px">${fmtIls(data.total)}</td>
      </tr>`
  }).join('')

  // RTL: тарих | לקוח | שיטה | תיאור | סכום — סכום справа в RTL = первая колонка визуально
  const paymentRows = d.payments.map((p, i) => `
    <tr style="border-bottom:1px solid #edf0f4;${i % 2 === 1 ? 'background:#f8f9fb' : ''}">
      <td style="padding:9px 12px;color:#888;font-size:11px;text-align:right">${p.date}</td>
      <td style="padding:9px 12px;font-weight:600;color:#1B2A4A;font-size:12px;text-align:right">${p.clientName}</td>
      <td style="padding:9px 12px;text-align:right">${methodBadge(p.method)}</td>
      <td style="padding:9px 12px;color:#555;font-size:11px;text-align:right;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.description || ''}</td>
      <td style="padding:9px 12px;font-weight:700;color:#1B2A4A;white-space:nowrap;text-align:right">${fmtIls(p.amount)}</td>
    </tr>`).join('')

  const footerContacts = [d.orgEmail, d.orgPhone, d.orgAddress].filter(Boolean).join(' · ')

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Heebo',Arial,sans-serif; background:#fff; direction:rtl; }
    table { direction:rtl; }
  </style>
</head>
<body>
<div style="background:#fff;width:794px;min-height:1123px;margin:0 auto;display:flex;flex-direction:column;font-family:'Heebo',Arial,sans-serif;direction:rtl">

  <!-- HEADER: לוגו משמאל, כותרת מימין (RTL) -->
  <div style="background:linear-gradient(135deg,#0f1e3d 0%,#1B2A4A 60%,#243560 100%);padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:center;direction:ltr">
    <div>
      ${d.logoDataUri
        ? `<img src="${d.logoDataUri}" style="height:80px;width:auto;object-fit:contain" alt="Logo">`
        : `<div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">${d.orgName}</div>`
      }
    </div>
    <div style="text-align:right;direction:rtl">
      <div style="font-size:22px;font-weight:800;color:#D4AA50;line-height:1;margin-bottom:6px">סיכום תשלומים</div>
      <div style="font-size:11px;color:rgba(255,255,255,.55)">מספר: <span style="color:rgba(255,255,255,.9);font-weight:600">#${d.docNumber}</span></div>
      <div style="display:inline-flex;align-items:center;background:rgba(212,170,80,.12);border:1px solid rgba(212,170,80,.4);border-radius:20px;padding:3px 10px;font-size:11px;color:#D4AA50;font-weight:600;margin-top:6px;direction:ltr">
        📅 ${d.fromDate} — ${d.toDate}
      </div>
    </div>
  </div>

  <!-- GOLD BAR -->
  <div style="height:4px;background:linear-gradient(90deg,#D4AA50,#f0d080,#D4AA50)"></div>

  <!-- INFO STRIP -->
  <div style="background:#f8f9fb;border-bottom:1px solid #e2e6ed;padding:14px 36px;display:flex;gap:36px;direction:rtl">
    <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">תאריך הפקה</div><div style="font-size:13px;font-weight:600;color:#1B2A4A">${d.issueDate}</div></div>
    <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">עסק</div><div style="font-size:13px;font-weight:600;color:#1B2A4A">${d.orgName}</div></div>
    <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">סה"כ תשלומים</div><div style="font-size:15px;font-weight:700;color:#D4AA50">${fmtIls(total)}</div></div>
    <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">מספר עסקאות</div><div style="font-size:15px;font-weight:700;color:#1B2A4A">${d.payments.length}</div></div>
  </div>

  <!-- SUMMARY BY METHOD -->
  <div style="padding:20px 36px 0;direction:rtl">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:10px">סיכום לפי אמצעי תשלום</div>
    <table style="width:300px;border-collapse:collapse;font-size:12px;background:#f8f9fb;border:1px solid #e2e6ed;border-radius:8px;overflow:hidden;direction:rtl">
      <thead>
        <tr style="background:#1B2A4A;color:#fff">
          <th style="padding:8px 12px;text-align:right;font-size:10px">אמצעי תשלום</th>
          <th style="padding:8px 12px;text-align:center;font-size:10px">עסקאות</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px">סכום</th>
        </tr>
      </thead>
      <tbody>${summaryRows}</tbody>
      <tfoot>
        <tr style="background:#1B2A4A">
          <td colspan="2" style="padding:10px 12px;color:#fff;font-weight:700;font-size:12px;text-align:right">סה"כ</td>
          <td style="padding:10px 12px;color:#D4AA50;font-weight:800;font-size:14px;text-align:right">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- PAYMENTS TABLE -->
  <div style="padding:20px 36px;direction:rtl">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:10px">פירוט תשלומים</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;direction:rtl">
      <thead>
        <tr style="background:#1B2A4A;color:#fff">
          <th style="padding:10px 12px;text-align:right;font-size:10px;border-radius:0 6px 6px 0">תאריך</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px">לקוח</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px">אמצעי תשלום</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px">תיאור</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;border-radius:6px 0 0 6px">סכום</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>

  <!-- SPACER -->
  <div style="flex:1"></div>

  <!-- FOOTER — как в Предложении -->
  <div style="background:#1B2A4A;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;direction:ltr">
    <div style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.8">
      <div style="color:#D4AA50;font-weight:700;font-size:11px">${d.orgName}</div>
      ${footerContacts}
    </div>
    <div style="font-size:10px;color:rgba(255,255,255,.4);text-align:right;direction:rtl">
      מופק ע"י <span style="color:rgba(255,255,255,.7)">Trinity CRM</span><br>
      סיכום תשלומים #${d.docNumber}
    </div>
  </div>

</div>
</body>
</html>`
}
