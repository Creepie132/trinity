// Email templates for Trinity CRM
// Support: Hebrew (RTL), Russian, English
// Brand color: #6366f1 (Trinity purple)

const emailStyles = `
  body { 
    margin: 0; 
    padding: 0; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
  .container { 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 20px; 
    background: #ffffff;
  }
  .header { 
    background: #6366f1; 
    color: white; 
    padding: 30px 20px; 
    text-align: center; 
    border-radius: 8px 8px 0 0;
  }
  .content { 
    padding: 30px 20px; 
    background: #f9fafb; 
    border-radius: 0 0 8px 8px;
  }
  .info-row { 
    padding: 12px 0; 
    border-bottom: 1px solid #e5e7eb;
  }
  .label { 
    font-weight: 600; 
    color: #374151; 
    margin-bottom: 4px;
  }
  .value { 
    color: #6b7280; 
    font-size: 16px;
  }
  .footer { 
    text-align: center; 
    padding: 20px; 
    color: #9ca3af; 
    font-size: 12px;
  }
  .rtl { 
    direction: rtl; 
    text-align: right;
  }
`

/**
 * Receipt email (sent after successful payment)
 */
export function receiptEmail(
  clientName: string,
  amount: number,
  date: string,
  serviceName: string,
  transactionId: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Trinity CRM</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">קבלה על תשלום | Квитанция об оплате | Payment Receipt</p>
    </div>
    <div class="content">
      <div class="rtl">
        <h2 style="color: #6366f1; margin-top: 0;">שלום ${clientName},</h2>
        <p style="font-size: 16px; color: #374151;">תודה על התשלום שלך. להלן פרטי העסקה:</p>
        
        <div class="info-row">
          <div class="label">סכום</div>
          <div class="value">₪${amount}</div>
        </div>
        <div class="info-row">
          <div class="label">תאריך</div>
          <div class="value">${date}</div>
        </div>
        <div class="info-row">
          <div class="label">שירות</div>
          <div class="value">${serviceName}</div>
        </div>
        <div class="info-row">
          <div class="label">מזהה עסקה</div>
          <div class="value">${transactionId}</div>
        </div>
        
        <p style="margin-top: 30px; color: #6b7280;">נשמח לראותך שוב בקרוב!</p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div>
        <h2 style="color: #6366f1; margin-top: 0;">Здравствуйте, ${clientName}!</h2>
        <p style="font-size: 16px; color: #374151;">Спасибо за ваш платеж. Детали транзакции:</p>
        
        <div class="info-row">
          <div class="label">Сумма</div>
          <div class="value">₪${amount}</div>
        </div>
        <div class="info-row">
          <div class="label">Дата</div>
          <div class="value">${date}</div>
        </div>
        <div class="info-row">
          <div class="label">Услуга</div>
          <div class="value">${serviceName}</div>
        </div>
        <div class="info-row">
          <div class="label">ID транзакции</div>
          <div class="value">${transactionId}</div>
        </div>
        
        <p style="margin-top: 30px; color: #6b7280;">Будем рады видеть вас снова!</p>
      </div>
    </div>
    <div class="footer">
      Trinity CRM © 2026 | Powered by AmberSol
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Booking confirmation email (sent to client after booking)
 */
export function bookingConfirmEmail(
  clientName: string,
  date: string,
  time: string,
  serviceName: string,
  businessName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✓ ${businessName}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">התור שלך אושר | Ваша запись подтверждена | Appointment Confirmed</p>
    </div>
    <div class="content">
      <div class="rtl">
        <h2 style="color: #6366f1; margin-top: 0;">שלום ${clientName},</h2>
        <p style="font-size: 16px; color: #374151;">התור שלך אושר בהצלחה!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #6366f1;">
          <div class="info-row">
            <div class="label">📅 תאריך</div>
            <div class="value">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 שעה</div>
            <div class="value">${time}</div>
          </div>
          <div class="info-row">
            <div class="label">💎 שירות</div>
            <div class="value">${serviceName}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">🏢 עסק</div>
            <div class="value">${businessName}</div>
          </div>
        </div>
        
        <p style="color: #6b7280;">נשלח לך תזכורת יום לפני המועד.</p>
        <p style="color: #6b7280; margin-top: 20px;">מחכים לראותך! 💜</p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div>
        <h2 style="color: #6366f1; margin-top: 0;">Здравствуйте, ${clientName}!</h2>
        <p style="font-size: 16px; color: #374151;">Ваша запись успешно подтверждена!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <div class="info-row">
            <div class="label">📅 Дата</div>
            <div class="value">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 Время</div>
            <div class="value">${time}</div>
          </div>
          <div class="info-row">
            <div class="label">💎 Услуга</div>
            <div class="value">${serviceName}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">🏢 Компания</div>
            <div class="value">${businessName}</div>
          </div>
        </div>
        
        <p style="color: #6b7280;">Мы отправим вам напоминание за день до визита.</p>
        <p style="color: #6b7280; margin-top: 20px;">Ждем вас! 💜</p>
      </div>
    </div>
    <div class="footer">
      Trinity CRM © 2026 | ${businessName}
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Reminder email (sent 1 day before appointment)
 */
export function reminderEmail(
  clientName: string,
  date: string,
  time: string,
  serviceName: string,
  businessName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
      <h1 style="margin: 0; font-size: 24px;">⏰ תזכורת | Напоминание</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${businessName}</p>
    </div>
    <div class="content">
      <div class="rtl">
        <h2 style="color: #6366f1; margin-top: 0;">שלום ${clientName},</h2>
        <p style="font-size: 18px; color: #374151; font-weight: 600;">התור שלך מחר! 🎉</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.1);">
          <div class="info-row">
            <div class="label">📅 תאריך</div>
            <div class="value" style="color: #6366f1; font-weight: 600;">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 שעה</div>
            <div class="value" style="color: #6366f1; font-weight: 600;">${time}</div>
          </div>
          <div class="info-row">
            <div class="label">💎 שירות</div>
            <div class="value">${serviceName}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">🏢 מיקום</div>
            <div class="value">${businessName}</div>
          </div>
        </div>
        
        <p style="background: #fef3c7; padding: 15px; border-radius: 6px; color: #92400e; border-right: 3px solid #f59e0b;">
          💡 <strong>טיפ:</strong> מומלץ להגיע 5 דקות לפני המועד
        </p>
        
        <p style="color: #6b7280; margin-top: 20px;">נתראה מחר! ✨</p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div>
        <h2 style="color: #6366f1; margin-top: 0;">Здравствуйте, ${clientName}!</h2>
        <p style="font-size: 18px; color: #374151; font-weight: 600;">Ваша запись завтра! 🎉</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.1);">
          <div class="info-row">
            <div class="label">📅 Дата</div>
            <div class="value" style="color: #6366f1; font-weight: 600;">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 Время</div>
            <div class="value" style="color: #6366f1; font-weight: 600;">${time}</div>
          </div>
          <div class="info-row">
            <div class="label">💎 Услуга</div>
            <div class="value">${serviceName}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">🏢 Адрес</div>
            <div class="value">${businessName}</div>
          </div>
        </div>
        
        <p style="background: #fef3c7; padding: 15px; border-radius: 6px; color: #92400e; border-left: 3px solid #f59e0b;">
          💡 <strong>Совет:</strong> Рекомендуем прийти на 5 минут раньше
        </p>
        
        <p style="color: #6b7280; margin-top: 20px;">До встречи завтра! ✨</p>
      </div>
    </div>
    <div class="footer">
      Trinity CRM © 2026 | ${businessName}
    </div>
  </div>
</body>
</html>
  `
}

/**
 * New booking notification email (sent to business owner)
 */
export function newBookingNotifyEmail(
  clientName: string,
  clientPhone: string,
  date: string,
  time: string,
  serviceName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <h1 style="margin: 0; font-size: 24px;">🔔 תור חדש | Новая запись</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Trinity CRM</p>
    </div>
    <div class="content">
      <div class="rtl">
        <h2 style="color: #10b981; margin-top: 0;">נקבע תור חדש!</h2>
        <p style="font-size: 16px; color: #374151;">פרטי הלקוח והתור:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #10b981;">
          <div class="info-row">
            <div class="label">👤 שם הלקוח</div>
            <div class="value" style="font-weight: 600; color: #111827;">${clientName}</div>
          </div>
          <div class="info-row">
            <div class="label">📱 טלפון</div>
            <div class="value" style="font-weight: 600; color: #111827;">${clientPhone}</div>
          </div>
          <div class="info-row">
            <div class="label">📅 תאריך</div>
            <div class="value" style="color: #10b981; font-weight: 600;">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 שעה</div>
            <div class="value" style="color: #10b981; font-weight: 600;">${time}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">💎 שירות</div>
            <div class="value">${serviceName}</div>
          </div>
        </div>
        
        <p style="background: #d1fae5; padding: 15px; border-radius: 6px; color: #065f46; border-right: 3px solid #10b981;">
          ✅ הלקוח קיבל אישור למייל
        </p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div>
        <h2 style="color: #10b981; margin-top: 0;">Новая запись!</h2>
        <p style="font-size: 16px; color: #374151;">Информация о клиенте и записи:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <div class="info-row">
            <div class="label">👤 Имя клиента</div>
            <div class="value" style="font-weight: 600; color: #111827;">${clientName}</div>
          </div>
          <div class="info-row">
            <div class="label">📱 Телефон</div>
            <div class="value" style="font-weight: 600; color: #111827;">${clientPhone}</div>
          </div>
          <div class="info-row">
            <div class="label">📅 Дата</div>
            <div class="value" style="color: #10b981; font-weight: 600;">${date}</div>
          </div>
          <div class="info-row">
            <div class="label">🕐 Время</div>
            <div class="value" style="color: #10b981; font-weight: 600;">${time}</div>
          </div>
          <div class="info-row" style="border: none;">
            <div class="label">💎 Услуга</div>
            <div class="value">${serviceName}</div>
          </div>
        </div>
        
        <p style="background: #d1fae5; padding: 15px; border-radius: 6px; color: #065f46; border-left: 3px solid #10b981;">
          ✅ Клиент получил подтверждение на email
        </p>
      </div>
    </div>
    <div class="footer">
      Trinity CRM © 2026 | Powered by AmberSol
    </div>
  </div>
</body>
</html>
  `
}
