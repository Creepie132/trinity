'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Language = 'he' | 'ru' | 'en'

export default function PolicyPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('he')

  // Auto-detect language from HTML lang attribute
  useEffect(() => {
    const htmlLang = document.documentElement.lang
    if (htmlLang === 'ru') setLanguage('ru')
    else if (htmlLang === 'en') setLanguage('en')
  }, [])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
  }

  const dir = language === 'he' ? 'rtl' : 'ltr'
  const title = {
    he: 'מדיניות ביטולים ופרטיות',
    ru: 'Политика возвратов и конфиденциальность',
    en: 'Cancellation & Privacy Policy'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white" dir={dir}>
      {/* Header with Back Button */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={language === 'he' ? 'חזרה' : language === 'ru' ? 'Назад' : 'Back'}
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">{title[language]}</h1>
          </div>
          
          {/* Language Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('he')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === 'he' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🇮🇱 עברית
            </button>
            <button
              onClick={() => handleLanguageChange('ru')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === 'ru' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === 'en' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 lg:p-12 border border-white/10">
          
          {/* Hebrew Version */}
          {language === 'he' && (
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">מדיניות ביטולים והחזרות</h2>
            <h3 className="text-xl font-semibold mb-6 text-purple-400">מערכת טריניטי — אמבר סולושנס סיסטמס</h3>
            <p className="text-gray-300 mb-4">תאריך עדכון אחרון: פברואר 2026</p>
            <p className="text-gray-300 mb-8">מדיניות זו כפופה להוראות חוק הגנת הצרכן, התשמ&quot;א-1981, ותקנות הגנת הצרכן (ביטול עסקה), התשע&quot;א-2010.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 1: ביטול עסקה בתוך 14 ימים */}
            <h2 className="text-2xl font-bold mt-12 mb-4">1. ביטול עסקה בתוך 14 ימים (עסקת מכר מרחוק)</h2>
            <p className="mb-4">1.1 בהתאם לסעיף 14ג(ג) לחוק הגנת הצרכן, רשאי הלקוח לבטל את העסקה בתוך 14 ימים ממועד ביצוע העסקה או ממועד קבלת מסמך הגילוי (המאוחר מביניהם), ובלבד שהביטול נעשה לפחות שני ימי עבודה לפני מועד תחילת השירות.</p>
            <p className="mb-4">1.2 במקרה של ביטול בתוך 14 ימים: החברה תחזיר את כל התשלומים ששולמו, בניכוי דמי ביטול בשיעור של 5% ממחיר העסקה או 100 שקלים חדשים, לפי הנמוך מביניהם, בהתאם לסעיף 14ה(א) לחוק.</p>
            <p className="mb-4">1.3 אם הלקוח החל להשתמש בשירות בפועל בתוך 14 הימים, יחויב בנוסף בתשלום יחסי עבור תקופת השימוש בפועל.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 2: ביטול לאחר 14 ימים */}
            <h2 className="text-2xl font-bold mt-12 mb-4">2. ביטול לאחר 14 ימים</h2>
            <p className="mb-4">2.1 לאחר חלוף 14 ימים ממועד העסקה, הלקוח רשאי לבטל את המנוי בכל עת בהודעה מוקדמת של 14 ימים.</p>
            <p className="mb-4">2.2 <strong>מנוי חודשי:</strong> הביטול ייכנס לתוקף בתום תקופת החיוב הנוכחית. לא יינתן החזר עבור חודש שכבר שולם.</p>
            <p className="mb-4">2.3 <strong>מנוי תקופתי (3, 6 או 12 חודשים):</strong> הלקוח יחויב בתשלום עבור החודשים בהם השתמש בפועל לפי מחיר חודשי מלא (ללא הנחת תקופה), בתוספת דמי ביטול בשיעור 5% מסך הערך הכולל של העסקה, או 100 שקלים חדשים, לפי הנמוך מביניהם. יתרת הסכום תוחזר ללקוח.</p>
            <p className="mb-4">2.4 <strong>דוגמה לחישוב:</strong> לקוח רכש מנוי שנתי בעלות 480 שקלים לחודש (סה&quot;כ 5,760 שקלים). לאחר 4 חודשים ביקש לבטל. חיוב בפועל: 4 חודשים לפי מחיר מלא ללא הנחה. דמי ביטול: 5% מ-5,760 שקלים = 288 שקלים, או 100 שקלים — הנמוך מביניהם = 100 שקלים. החזר: הסכום ששולם פחות (4 חודשים במחיר מלא בתוספת 100 שקלים).</p>

            <hr className="border-white/20 my-8" />

            {/* Section 3: דמי הקמה */}
            <h2 className="text-2xl font-bold mt-12 mb-4">3. דמי הקמה</h2>
            <p className="mb-4">3.1 דמי ההקמה משקפים עבודה בפועל של הגדרה, התאמה ואפיון המערכת עבור הלקוח.</p>
            <p className="mb-4">3.2 אם הלקוח ביטל את העסקה בתוך 14 ימים ולפני שהחלה עבודת ההגדרה בפועל, דמי ההקמה יוחזרו במלואם (בניכוי דמי ביטול כאמור בסעיף 1.2).</p>
            <p className="mb-4">3.3 אם עבודת ההגדרה כבר החלה או הושלמה, דמי ההקמה לא יוחזרו, שכן מדובר בשירות שבוצע בפועל ולא ניתן להשבה בהתאם לסעיף 14ה(ב)(1) לחוק.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 4: החזר כספי */}
            <h2 className="text-2xl font-bold mt-12 mb-4">4. החזר כספי — אופן הביצוע</h2>
            <p className="mb-4">4.1 החזרים כספיים יבוצעו באמצעות אותו אמצעי תשלום ששימש לביצוע העסקה, בתוך 14 ימי עסקים ממועד אישור הביטול.</p>
            <p className="mb-4">4.2 במקרה של תשלום בכרטיס אשראי, ההחזר יבוצע באמצעות זיכוי הכרטיס. הלקוח מאשר כי ייתכן עיכוב של מספר ימים עד להופעת הזיכוי בחשבונו, בהתאם למדיניות חברת האשראי.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 5: ביטול מצד החברה */}
            <h2 className="text-2xl font-bold mt-12 mb-4">5. ביטול מצד החברה</h2>
            <p className="mb-4">5.1 החברה רשאית לבטל את ההסכם במקרים הבאים: הפרה מהותית של תנאי השימוש על ידי הלקוח; אי-תשלום למשך 30 ימים לאחר מועד החיוב, לאחר שנשלחו שתי תזכורות; שימוש לרעה במערכת או שימוש המפר את החוק.</p>
            <p className="mb-4">5.2 במקרה של ביטול מצד החברה, הלקוח יקבל הודעה מוקדמת של 14 ימים ויהיה זכאי לייצא את נתוניו בתקופה זו.</p>
            <p className="mb-4">5.3 אם הביטול נעשה שלא באשמת הלקוח, הלקוח יהיה זכאי להחזר יחסי עבור תקופת המנוי שלא נוצלה.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 6: ייצוא נתונים */}
            <h2 className="text-2xl font-bold mt-12 mb-4">6. ייצוא נתונים בעת ביטול</h2>
            <p className="mb-4">6.1 בכל מקרה של ביטול, הלקוח זכאי לייצא את כל נתוניו בפורמט דיגיטלי מקובל (קובץ נתונים מופרדים בפסיקים או גיליון אלקטרוני) בתוך 30 ימים ממועד הביטול.</p>
            <p className="mb-4">6.2 לאחר 30 ימים מתום ההסכם, כל נתוני הלקוח יימחקו לצמיתות מהמערכת ולא ניתן יהיה לשחזרם.</p>
            <p className="mb-4">6.3 החברה תסייע ללקוח בייצוא נתוניו ללא עלות נוספת.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 7: כוח עליון */}
            <h2 className="text-2xl font-bold mt-12 mb-4">7. כוח עליון</h2>
            <p className="mb-4">7.1 החברה לא תישא באחריות לאי-מתן שירות כתוצאה מנסיבות שאינן בשליטתה, לרבות: מלחמה, מבצע צבאי, אסון טבע, מגפה, תקלות תשתית ארציות, או החלטות ממשלתיות.</p>
            <p className="mb-4">7.2 במקרה של השבתת שירות ממושכת (מעל 14 ימים רצופים) עקב כוח עליון, הלקוח יהיה זכאי להארכת המנוי בתקופה שווה לתקופת ההשבתה, ללא תשלום נוסף.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 8: אוכלוסיות מיוחדות */}
            <h2 className="text-2xl font-bold mt-12 mb-4">8. אוכלוסיות מיוחדות</h2>
            <p className="mb-4">8.1 בהתאם לתיקון מספר 47 לחוק הגנת הצרכן, אדם עם מוגבלות, אזרח ותיק (מעל גיל 65), או עולה חדש (עד 5 שנים מיום העלייה) רשאי לבטל את העסקה בתוך ארבעה חודשים ממועד ביצועה, ובלבד שההתקשרות כללה שיחה (לרבות תקשורת אלקטרונית).</p>
            <p className="mb-4">8.2 דמי הביטול במקרה זה יהיו בהתאם לסעיף 1.2 לעיל (5% או 100 שקלים, לפי הנמוך).</p>

            <hr className="border-white/20 my-8" />

            {/* Section 9: תלונות ופניות */}
            <h2 className="text-2xl font-bold mt-12 mb-4">9. תלונות ופניות</h2>
            <p className="mb-4">9.1 לכל שאלה, בירור או תלונה בנושא ביטול והחזרות, ניתן לפנות אלינו:</p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-4 mb-4">
              <p className="font-semibold text-purple-400 mb-2">אמבר סולושנס סיסטמס</p>
              <p className="mb-2">ת.ז. 323358507 | עוסק פטור</p>
              <p className="mb-2">כתובת: מנחם בגין 10, אשקלון, ישראל</p>
              <p className="mb-2">טלפון: 054-4858586</p>
              <p className="mb-2">דוא&quot;ל: ambersolutions.systems@gmail.com</p>
              <p>אתר: ambersol.co.il</p>
            </div>
            <p className="mb-4">9.2 כל פנייה תיענה בתוך 5 ימי עסקים.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 10: הוראות חוק */}
            <h2 className="text-2xl font-bold mt-12 mb-4">10. הוראות חוק</h2>
            <p className="mb-4">מדיניות זו כפופה ומשלימה את הוראות הדין הישראלי, ובפרט: חוק הגנת הצרכן, התשמ&quot;א-1981; תקנות הגנת הצרכן (ביטול עסקה), התשע&quot;א-2010; חוק הגנת הפרטיות, התשמ&quot;א-1981.</p>
            <p className="mb-4">בכל מקרה של סתירה בין מדיניות זו לבין הוראות החוק, הוראות החוק יגברו.</p>

            <hr className="border-white/20 my-8" />

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-8 text-center">
              <p className="font-semibold text-purple-400 mb-2">אמבר סולושנס סיסטמס</p>
              <p className="text-sm">ת.ז. 323358507 | עוסק פטור</p>
              <p className="text-sm">מנחם בגין 10, אשקלון, ישראל</p>
              <p className="text-sm">054-4858586 | ambersolutions.systems@gmail.com</p>
            </div>

          </div>
          )}

          {/* Russian Version */}
          {language === 'ru' && (
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Политика возвратов</h2>
            <h3 className="text-xl font-semibold mb-6 text-purple-400">Система Trinity — Amber Solutions Systems</h3>
            <p className="text-gray-300 mb-4">Последнее обновление: февраль 2026</p>
            <p className="text-gray-300 mb-8">Настоящая политика соответствует Закону о защите прав потребителей, 1981, и Правилам защиты прав потребителей (Отмена сделки), 2010.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">1. Отмена сделки в течение 14 дней (дистанционная продажа)</h2>
            <p className="mb-4">1.1 В соответствии с разделом 14ג(ג) Закона о защите прав потребителей, Клиент вправе отменить сделку в течение 14 дней с момента совершения сделки или получения документа о раскрытии (в зависимости от того, что наступит позже), при условии что отмена произошла не менее чем за два рабочих дня до даты начала обслуживания.</p>
            <p className="mb-4">1.2 В случае отмены в течение 14 дней: Компания вернёт все уплаченные средства за вычетом платы за отмену в размере 5% от стоимости сделки или 100 новых шекелей, в зависимости от того, что меньше, в соответствии с разделом 14ה(א) Закона.</p>
            <p className="mb-4">1.3 Если Клиент начал фактически использовать сервис в течение 14 дней, будет дополнительно взиматься пропорциональная плата за период фактического использования.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">2. Отмена после 14 дней</h2>
            <p className="mb-4">2.1 По истечении 14 дней с момента сделки Клиент вправе отменить подписку в любое время с уведомлением за 14 дней.</p>
            <p className="mb-4">2.2 <strong>Месячная подписка:</strong> Отмена вступает в силу в конце текущего платёжного периода. Возврат средств за уже оплаченный месяц не производится.</p>
            <p className="mb-4">2.3 <strong>Периодическая подписка (3, 6 или 12 месяцев):</strong> Клиент оплачивает месяцы фактического использования по полной месячной цене (без скидки за период), плюс плата за отмену в размере 5% от общей стоимости сделки или 100 новых шекелей, в зависимости от того, что меньше. Остаток суммы будет возвращён Клиенту.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">3. Плата за установку (Setup Fee)</h2>
            <p className="mb-4">3.1 Плата за установку отражает фактическую работу по настройке, адаптации и конфигурации системы для Клиента.</p>
            <p className="mb-4">3.2 Если Клиент отменил сделку в течение 14 дней и до начала фактической работы по настройке, плата за установку возвращается в полном объёме (за вычетом платы за отмену, указанной в пункте 1.2).</p>
            <p className="mb-4">3.3 <strong>Если работа по настройке уже началась или была завершена</strong>, плата за установку <strong>не подлежит возврату</strong>, так как речь идёт об услуге, фактически оказанной и не подлежащей возврату в соответствии с разделом 14ה(ב)(1) Закона.</p>
            <p className="mb-4">3.4 <strong>Конфигурация модулей считается выполненной</strong>, если система была настроена под требования Клиента, включая активацию модулей, импорт данных или персонализацию интерфейса.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">9. Жалобы и обращения</h2>
            <p className="mb-4">9.1 По любым вопросам, уточнениям или жалобам, касающимся отмены и возврата средств, обращайтесь:</p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-4 mb-4">
              <p className="font-semibold text-purple-400 mb-2">Amber Solutions Systems</p>
              <p className="mb-2">И.Н. 323358507 | Освобождённый плательщик</p>
              <p className="mb-2">Адрес: Менахем Бегин 10, Ашкелон, Израиль</p>
              <p className="mb-2">Телефон: 054-4858586</p>
              <p className="mb-2">Email: ambersolutions.systems@gmail.com</p>
              <p>Сайт: ambersol.co.il</p>
            </div>
            <p className="mb-4">9.2 Ответ на каждое обращение будет дан в течение 5 рабочих дней.</p>

            <hr className="border-white/20 my-8" />

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-8 text-center">
              <p className="font-semibold text-purple-400 mb-2">Amber Solutions Systems</p>
              <p className="text-sm">И.Н. 323358507 | Освобождённый плательщик</p>
              <p className="text-sm">Менахем Бегин 10, Ашкелон, Израиль</p>
              <p className="text-sm">054-4858586 | ambersolutions.systems@gmail.com</p>
            </div>
          </div>
          )}

          {/* English Version */}
          {language === 'en' && (
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Cancellation & Refund Policy</h2>
            <h3 className="text-xl font-semibold mb-6 text-purple-400">Trinity System — Amber Solutions Systems</h3>
            <p className="text-gray-300 mb-4">Last updated: February 2026</p>
            <p className="text-gray-300 mb-8">This policy complies with the Consumer Protection Law, 1981, and Consumer Protection Regulations (Transaction Cancellation), 2010.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">1. Cancellation within 14 days (Distance Sale)</h2>
            <p className="mb-4">1.1 In accordance with section 14ג(ג) of the Consumer Protection Law, the Client may cancel the transaction within 14 days from the date of the transaction or receipt of the disclosure document (whichever is later), provided the cancellation occurs at least two business days before the service start date.</p>
            <p className="mb-4">1.2 In case of cancellation within 14 days: The Company will refund all payments made, less a cancellation fee of 5% of the transaction price or 100 new shekels, whichever is lower, in accordance with section 14ה(א) of the Law.</p>
            <p className="mb-4">1.3 If the Client has started using the service in practice within the 14 days, a proportional payment for the period of actual use will be additionally charged.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">2. Cancellation after 14 days</h2>
            <p className="mb-4">2.1 After 14 days from the transaction date, the Client may cancel the subscription at any time with 14 days&apos; advance notice.</p>
            <p className="mb-4">2.2 <strong>Monthly subscription:</strong> Cancellation takes effect at the end of the current billing period. No refund for the already paid month.</p>
            <p className="mb-4">2.3 <strong>Period subscription (3, 6, or 12 months):</strong> The Client will be charged for the months actually used at the full monthly price (without period discount), plus a cancellation fee of 5% of the total transaction value or 100 new shekels, whichever is lower. The balance will be refunded to the Client.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">3. Setup Fee</h2>
            <p className="mb-4">3.1 The setup fee reflects actual work performed in configuring, adapting, and customizing the system for the Client.</p>
            <p className="mb-4">3.2 If the Client cancelled the transaction within 14 days and before actual configuration work began, the setup fee will be refunded in full (minus the cancellation fee mentioned in section 1.2).</p>
            <p className="mb-4">3.3 <strong>If configuration work has already started or been completed</strong>, the setup fee is <strong>non-refundable</strong>, as it represents a service actually performed and non-returnable in accordance with section 14ה(ב)(1) of the Law.</p>
            <p className="mb-4">3.4 <strong>Module configuration is considered complete</strong> if the system has been customized to the Client&apos;s requirements, including module activation, data import, or interface personalization.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">9. Complaints and Inquiries</h2>
            <p className="mb-4">9.1 For any questions, clarifications, or complaints regarding cancellation and refunds, contact us:</p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-4 mb-4">
              <p className="font-semibold text-purple-400 mb-2">Amber Solutions Systems</p>
              <p className="mb-2">ID 323358507 | Exempt Business</p>
              <p className="mb-2">Address: Menachem Begin 10, Ashkelon, Israel</p>
              <p className="mb-2">Phone: 054-4858586</p>
              <p className="mb-2">Email: ambersolutions.systems@gmail.com</p>
              <p>Website: ambersol.co.il</p>
            </div>
            <p className="mb-4">9.2 Each inquiry will be answered within 5 business days.</p>

            <hr className="border-white/20 my-8" />

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mt-8 text-center">
              <p className="font-semibold text-purple-400 mb-2">Amber Solutions Systems</p>
              <p className="text-sm">ID 323358507 | Exempt Business</p>
              <p className="text-sm">Menachem Begin 10, Ashkelon, Israel</p>
              <p className="text-sm">054-4858586 | ambersolutions.systems@gmail.com</p>
            </div>
          </div>
          )}

        </div>
      </main>
    </div>
  )
}
