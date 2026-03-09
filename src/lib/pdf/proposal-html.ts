import { ProposalData } from './proposal-types'

function fmt(n: number): string {
  return '₪\u00a0' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function detailLines(fields: (string | undefined)[]): string {
  return fields
    .filter(Boolean)
    .map(f => `<span style="font-size:12px;color:#444;line-height:1.9;display:block">${f}</span>`)
    .join('')
}

export function buildProposalHTML(d: ProposalData, logoDataUri: string): string {
  // Valid until date
  let validUntilStr = ''
  if (d.validDays) {
    const [dd, mm, yy] = d.issueDate.split('/').map(Number)
    const date = new Date(yy, mm - 1, dd)
    date.setDate(date.getDate() + d.validDays)
    const pd = String(date.getDate()).padStart(2, '0')
    const pm = String(date.getMonth() + 1).padStart(2, '0')
    validUntilStr = `${pd}/${pm}/${date.getFullYear()}`
  }

  // Items rows
  let subtotal = 0
  const itemsRows = d.items.map((item, i) => {
    const line = item.qty * item.price
    subtotal += line
    const subParts = [item.volume, item.desc].filter(Boolean)
    const subHtml = subParts.length
      ? `<span style="font-size:10px;color:#999;display:block;margin-top:2px">${subParts.join(' — ')}</span>`
      : ''
    const nameStyle = subParts.length === 0 ? 'display:flex;align-items:center' : ''

    return `
      <tr style="border-bottom:1px solid #edf0f4;${i % 2 === 1 ? 'background:#f8f9fb' : ''}">
        <td style="padding:11px 12px;color:#bbb;font-size:10px;width:32px">${i + 1}</td>
        <td style="padding:11px 12px;${nameStyle}">
          <div>
            <strong style="font-size:12px;color:#1B2A4A;font-weight:600">${item.name}</strong>
            ${subHtml}
          </div>
        </td>
        <td style="padding:11px 12px;text-align:center;color:#333">${item.qty}</td>
        <td style="padding:11px 12px;color:#1B2A4A;font-weight:600;white-space:nowrap">${fmt(item.price)}</td>
        <td style="padding:11px 12px;color:#1B2A4A;font-weight:700;white-space:nowrap">${fmt(line)}</td>
      </tr>`
  }).join('')

  // Totals
  let discountAmt = 0
  let discountRowHtml = ''
  if (d.discount && d.discount.value > 0) {
    if (d.discount.type === 'percent') {
      discountAmt = subtotal * d.discount.value / 100
      discountRowHtml = `<div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:#c44;border-bottom:1px solid #e2e6ed"><label>הנחה (${d.discount.value}%)</label><span>− ${fmt(discountAmt)}</span></div>`
    } else {
      discountAmt = d.discount.value
      const pct = ((discountAmt / subtotal) * 100).toFixed(1)
      discountRowHtml = `<div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:#c44;border-bottom:1px solid #e2e6ed"><label>הנחה (${pct}%)</label><span>− ${fmt(discountAmt)}</span></div>`
    }
  }

  const afterDiscount = subtotal - discountAmt

  let vatAmt = 0
  let vatRowHtml = ''
  if (d.vat && d.vat > 0) {
    vatAmt = afterDiscount * d.vat / 100
    vatRowHtml = `<div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:#555;border-bottom:1px solid #e2e6ed"><label>מע"מ (${d.vat}%)</label><span>${fmt(vatAmt)}</span></div>`
  }

  const grand = afterDiscount + vatAmt

  // Notes
  const notesHtml = d.notes?.trim()
    ? `<div style="padding:0 36px 20px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:8px">הערות</div>
        <div style="background:#fffbf0;border:1px solid #f0d080;border-radius:6px;padding:11px 14px;font-size:12px;color:#554;line-height:1.7">
          ${d.notes.replace(/\n/g, '<br>')}
        </div>
      </div>`
    : ''

  // Footer contacts
  const footerContacts = [d.seller.email, d.seller.phone, d.seller.website]
    .filter(Boolean).join(' · ')

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Heebo',Arial,sans-serif; background:#fff; direction:rtl; }
  </style>
</head>
<body>
  <div style="background:#fff;width:794px;margin:0 auto;display:flex;flex-direction:column;font-family:'Heebo',Arial,sans-serif">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#0f1e3d 0%,#1B2A4A 60%,#243560 100%);padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:center">
      <div>
        ${logoDataUri
          ? `<img src="${logoDataUri}" style="height:56px;object-fit:contain" alt="Logo">`
          : `<div style="color:#D4AA50;font-size:18px;font-weight:800">${d.seller.name}</div>`
        }
      </div>
      <div style="text-align:left;color:#fff">
        <div style="font-size:24px;font-weight:800;color:#D4AA50;line-height:1;margin-bottom:6px">הצעת מחיר</div>
        <div style="font-size:12px;color:rgba(255,255,255,.55)">מספר: <span style="color:rgba(255,255,255,.9);font-weight:600">#${d.docNumber}</span></div>
        ${validUntilStr
          ? `<div style="display:inline-flex;align-items:center;background:rgba(212,170,80,.12);border:1px solid rgba(212,170,80,.4);border-radius:20px;padding:3px 10px;font-size:11px;color:#D4AA50;font-weight:600;margin-top:6px">⏱ בתוקף עד ${validUntilStr}</div>`
          : ''
        }
      </div>
    </div>

    <!-- GOLD BAR -->
    <div style="height:4px;background:linear-gradient(90deg,#D4AA50,#f0d080,#D4AA50)"></div>

    <!-- INFO STRIP -->
    <div style="background:#f8f9fb;border-bottom:1px solid #e2e6ed;padding:16px 36px;display:flex;gap:36px">
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">תאריך הנפקה</div><div style="font-size:13px;font-weight:600;color:#1B2A4A">${d.issueDate}</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">מספר הצעה</div><div style="font-size:13px;font-weight:600;color:#1B2A4A">#${d.docNumber}</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a95a3;margin-bottom:3px">סכום לתשלום</div><div style="font-size:15px;font-weight:600;color:#D4AA50">${fmt(grand)}</div></div>
    </div>

    <!-- PARTIES -->
    <div style="padding:20px 36px;display:grid;grid-template-columns:1fr 1px 1fr">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #D4AA50;display:inline-block">מוכר</div>
        <div style="font-size:14px;font-weight:700;color:#1B2A4A;margin-bottom:4px">${d.seller.name}</div>
        ${detailLines([d.seller.email, d.seller.phone, d.seller.website, d.seller.address])}
      </div>
      <div style="background:#e2e6ed;margin:0 24px"></div>
      <div style="padding-right:24px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #D4AA50;display:inline-block">לקוח</div>
        <div style="font-size:14px;font-weight:700;color:#1B2A4A;margin-bottom:4px">${d.buyer.name}</div>
        ${detailLines([d.buyer.org, d.buyer.phone, d.buyer.email, d.buyer.address])}
      </div>
    </div>

    <!-- TABLE -->
    <div style="padding:0 36px 20px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a95a3;margin-bottom:8px">פירוט המוצרים / השירותים</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1B2A4A;color:#fff">
            <th style="padding:10px 12px;text-align:right;font-size:10px;width:32px;border-radius:0 6px 6px 0">#</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px">תיאור</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;width:64px">כמות</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;width:100px">מחיר יחידה</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;width:100px;border-radius:6px 0 0 6px">סה"כ</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <!-- TOTALS -->
    <div style="padding:0 36px 20px">
      <div style="width:250px;background:#f8f9fb;border:1px solid #e2e6ed;border-radius:8px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:#555;border-bottom:1px solid #e2e6ed"><label>סכום ביניים</label><span>${fmt(subtotal)}</span></div>
        ${discountRowHtml}
        ${vatRowHtml}
        <div style="display:flex;justify-content:space-between;padding:12px;font-size:13px;font-weight:700;background:#1B2A4A;color:#fff"><label>לתשלום</label><span style="color:#D4AA50;font-size:16px">${fmt(grand)}</span></div>
      </div>
    </div>

    ${notesHtml}

    <!-- SIGNATURES -->
    <div style="padding:0 36px 28px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div>
        <div style="font-size:10px;color:#8a95a3;font-weight:600;letter-spacing:.5px;margin-bottom:32px">חתימת המוכר</div>
        <div style="border-top:1.5px solid #1B2A4A;padding-top:5px;font-size:11px;color:#666">${d.seller.name}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#8a95a3;font-weight:600;letter-spacing:.5px;margin-bottom:32px">חתימת הלקוח / אישור</div>
        <div style="border-top:1.5px solid #1B2A4A;padding-top:5px;font-size:11px;color:#ccc">_________________________________</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#1B2A4A;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;margin-top:auto">
      <div style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.8">
        <div style="color:#D4AA50;font-weight:700;font-size:11px">${d.seller.name}</div>
        ${footerContacts}
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,.4);text-align:left">
        מופק ע"י <span style="color:rgba(255,255,255,.7)">Trinity CRM</span><br>
        הצעת מחיר #${d.docNumber}
      </div>
    </div>

  </div>
</body>
</html>`
}
