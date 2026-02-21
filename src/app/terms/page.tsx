'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Language = 'he' | 'ru' | 'en'

export default function TermsPage() {
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
    he: 'תקנון שימוש',
    ru: 'Условия использования',
    en: 'Terms of Service'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white" dir={dir}>
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
                  ? 'bg-amber-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🇮🇱 עברית
            </button>
            <button
              onClick={() => handleLanguageChange('ru')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === 'ru' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                language === 'en' 
                  ? 'bg-amber-500 text-white' 
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
            <h2 className="text-3xl font-bold mb-4">תקנון שימוש — אמבר סולושנס סיסטמס</h2>
            <h3 className="text-xl font-semibold mb-6 text-amber-400">מערכת טריניטי לניהול עסקי</h3>
            <p className="text-gray-300 mb-8">תאריך עדכון אחרון: פברואר 2026</p>

            <hr className="border-white/20 my-8" />

            {/* Section 1: כללי */}
            <h2 className="text-2xl font-bold mt-12 mb-4">1. כללי</h2>
            <p className="mb-4">1.1 תקנון זה מהווה הסכם מחייב בין המשתמש (להלן: &quot;הלקוח&quot;) לבין אמבר סולושנס סיסטמס, ת.ז. 323358507, עוסק פטור (להלן: &quot;החברה&quot;).</p>
            <p className="mb-4">1.2 השימוש במערכת טריניטי (להלן: &quot;המערכת&quot; או &quot;השירות&quot;) מהווה הסכמה מלאה לכל תנאי תקנון זה.</p>
            <p className="mb-4">1.3 החברה רשאית לעדכן תקנון זה מעת לעת. הודעה על שינויים מהותיים תישלח ללקוח באמצעות דואר אלקטרוני או הודעה במערכת, לפחות 14 ימים לפני כניסתם לתוקף.</p>
            <p className="mb-4">1.4 תקנון זה נכתב בלשון זכר מטעמי נוחות בלבד, אך מתייחס לכל המינים.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 2: הגדרות */}
            <h2 className="text-2xl font-bold mt-12 mb-4">2. הגדרות</h2>
            <p className="mb-4">2.1 <strong>&quot;המערכת&quot;</strong> — תוכנה מבוססת ענן לניהול קשרי לקוחות ותפעול עסקי, המאפשרת ניהול תורים, מאגר לקוחות, תשלומים, מלאי ושירותים נלווים. המערכת עשויה לכלול רישיונות תוכנה למכשירים ניידים, לרבות פתרון קבלת תשלומים באמצעות הנחת כרטיס על מכשיר נייד. שירות זה מותנה בקיום רכיב תקשורת קרבה (מסוג עמ&quot;ק) במכשיר הנייד של הלקוח ובמערכת הפעלה תואמת. החברה אינה אחראית לתקלות הנובעות מאי-תאימות המכשיר של הלקוח לטכנולוגיה זו.</p>
            <p className="mb-4">2.2 <strong>&quot;מנוי&quot;</strong> — תקופת השימוש בשירות בהתאם לתוכנית שנבחרה על ידי הלקוח.</p>
            <p className="mb-4">2.3 <strong>&quot;מודול&quot;</strong> — יחידת שירות עצמאית במערכת (כגון: ניהול לקוחות, תשלומים, מלאי וכדומה) הניתנת להפעלה או כיבוי בהתאם לתוכנית הלקוח.</p>
            <p className="mb-4">2.4 <strong>&quot;דמי הקמה&quot;</strong> — תשלום חד-פעמי עבור הגדרה ראשונית והתאמת המערכת לצרכי הלקוח.</p>
            <p className="mb-4">2.5 <strong>&quot;נתוני הלקוח&quot;</strong> — כל מידע שהלקוח או לקוחותיו מזינים למערכת, לרבות פרטי לקוחות, היסטוריית ביקורים, תשלומים ומסמכים.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 3: תיאור השירות */}
            <h2 className="text-2xl font-bold mt-12 mb-4">3. תיאור השירות</h2>
            <p className="mb-4">3.1 המערכת מספקת כלים לניהול עסקי הכוללים, בין היתר: ניהול מאגר לקוחות, ניהול תורים וביקורים, קבלת תשלומים מקוונים, ניהול מלאי ומוצרים, שליחת הודעות ותזכורות, דוחות וסטטיסטיקות, ומודולים נוספים בהתאם לתוכנית שנבחרה.</p>
            <p className="mb-4">3.2 החברה מתחייבת לספק זמינות שירות של 99.9% בממוצע חודשי, למעט תקופות תחזוקה מתוכננות שעליהן תינתן הודעה מראש של 24 שעות.</p>
            <p className="mb-4">3.3 החברה רשאית לבצע שדרוגים ועדכונים למערכת מעת לעת. שדרוגים אלו לא יפגעו בתפקוד הקיים של המערכת.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 4: הרשמה ותנאי שימוש */}
            <h2 className="text-2xl font-bold mt-12 mb-4">4. הרשמה ותנאי שימוש</h2>
            <p className="mb-4">4.1 השימוש במערכת מותנה ברישום ובמסירת פרטים מדויקים ועדכניים.</p>
            <p className="mb-4">4.2 הלקוח מתחייב שלא להעביר את פרטי הגישה שלו לגורם שלישי ואחראי לכל פעולה שמתבצעת בחשבונו.</p>
            <p className="mb-4">4.3 הלקוח מתחייב להשתמש במערכת בהתאם לכל דין ולא לשימוש בלתי חוקי, פוגעני או מפר זכויות של צדדים שלישיים.</p>
            <p className="mb-4">4.4 החברה רשאית להשעות או לסגור חשבון לקוח שמפר את תנאי תקנון זה, לאחר מתן התראה של 7 ימים, למעט במקרים של הפרה חמורה שבהם ההשעיה תהיה מיידית.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 5: תשלומים ותמחור */}
            <h2 className="text-2xl font-bold mt-12 mb-4">5. תשלומים ותמחור</h2>
            <p className="mb-4">5.1 השירות ניתן בתשלום חודשי או תקופתי, בהתאם לתוכנית שבחר הלקוח.</p>
            <p className="mb-4">5.2 דמי ההקמה נגבים פעם אחת בעת ההצטרפות ואינם ניתנים להחזר לאחר ביצוע עבודת ההגדרה.</p>
            <p className="mb-4">5.3 התשלומים מעובדים באמצעות ספק שירותי סליקה מורשה בישראל. החברה אינה שומרת פרטי כרטיסי אשראי בשרתיה. כל נתוני התשלום מועברים ישירות לספק הסליקה בערוץ מוצפן.</p>
            <p className="mb-4">5.4 החברה רשאית לעדכן את מחירי השירות בהודעה מוקדמת של 30 ימים. עדכון מחירים לא יחול על תקופת מנוי ששולמה מראש.</p>
            <p className="mb-4">5.5 אי-תשלום במועד יגרור הקפאת חשבון לאחר 7 ימי חסד. לאחר 30 ימים נוספים ללא תשלום, החברה רשאית למחוק את החשבון ואת כל הנתונים הקשורים אליו, לאחר מתן הודעה נוספת.</p>
            <p className="mb-4">5.6 המחירים המוצגים הם מחירים סופיים. בהתאם למעמד החברה כעוסק פטור, אין החברה גובה מס ערך מוסף (מע&quot;מ) בהתאם לחוק מס ערך מוסף, התשל&quot;ו-1975.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 6: קניין רוחני */}
            <h2 className="text-2xl font-bold mt-12 mb-4">6. קניין רוחני</h2>
            <p className="mb-4">6.1 כל זכויות הקניין הרוחני במערכת, לרבות קוד מקור, עיצוב, סימן מסחרי ותכנים, שייכות לחברה בלבד.</p>
            <p className="mb-4">6.2 נתוני הלקוח שייכים ללקוח בלבד. החברה לא תעשה כל שימוש בנתוני הלקוח למטרות שאינן קשורות למתן השירות.</p>
            <p className="mb-4">6.3 הלקוח מעניק לחברה רישיון מוגבל לשימוש בנתוניו אך ורק לצורך אספקת השירות, תחזוקתו ושיפורו.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 7: פרטיות והגנת מידע */}
            <h2 className="text-2xl font-bold mt-12 mb-4">7. פרטיות והגנת מידע</h2>
            <p className="mb-4">7.1 החברה מתחייבת לשמור על פרטיות נתוני הלקוח בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, ותקנות הגנת הפרטיות (אבטחת מידע), התשע&quot;ז-2017.</p>
            <p className="mb-4">7.2 נתוני הלקוח מאוחסנים בשרתים מאובטחים עם הצפנה, בידוד נתונים ברמת בסיס הנתונים, ומנגנון גיבוי יומי.</p>
            <p className="mb-4">7.3 החברה לא תעביר נתוני לקוח לצד שלישי ללא הסכמת הלקוח, למעט כאשר הדבר נדרש על פי צו בית משפט או דרישה חוקית אחרת.</p>
            <p className="mb-4">7.4 הלקוח זכאי בכל עת לבקש ייצוא של כל נתוניו בפורמט דיגיטלי מקובל, וכן למחיקה מלאה של נתוניו מהמערכת.</p>
            <p className="mb-4">7.5 המערכת מנהלת יומן פעולות מאובטח המתעד כל שינוי מהותי בנתונים, לצורך בקרה ואבטחת מידע.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 8: אבטחת מידע */}
            <h2 className="text-2xl font-bold mt-12 mb-4">8. אבטחת מידע</h2>
            <p className="mb-4">8.1 כל התקשורת בין המשתמש למערכת מוצפנת בפרוטוקול מאובטח.</p>
            <p className="mb-4">8.2 נתוני כל ארגון מבודדים לחלוטין ברמת בסיס הנתונים, כך שאין אפשרות לגשת לנתוני ארגון אחר.</p>
            <p className="mb-4">8.3 המערכת כוללת הגנה מפני ריבוי בקשות זדוניות, אימות זהות רב-שלבי, ובקרת הרשאות לפי תפקיד (בעלים, מנהל, עובד).</p>
            <p className="mb-4">8.4 החברה מבצעת בדיקות אבטחה תקופתיות ומעדכנת את מנגנוני ההגנה בהתאם לסטנדרטים המקובלים בתעשייה.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 9: אחריות ומגבלות */}
            <h2 className="text-2xl font-bold mt-12 mb-4">9. אחריות ומגבלות</h2>
            <p className="mb-4">9.1 החברה תעשה מאמצים סבירים לספק שירות רציף ואמין, אך אינה מתחייבת לפעולה ללא תקלות.</p>
            <p className="mb-4">9.2 אחריות החברה מוגבלת לסכום ששולם על ידי הלקוח בשלושת החודשים שקדמו לאירוע הנזק.</p>
            <p className="mb-4">9.3 החברה לא תישא באחריות לנזקים עקיפים, תוצאתיים או מיוחדים, לרבות אובדן רווחים, אובדן נתונים (מעבר לגיבויים הזמינים), או הפסקת פעילות עסקית.</p>
            <p className="mb-4">9.4 החברה לא אחראית לתקלות הנובעות מגורמים שאינם בשליטתה, לרבות תקלות תקשורת, כוח עליון, או תקלות בשירותי צד שלישי.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 10: תקופת ההסכם וסיומו */}
            <h2 className="text-2xl font-bold mt-12 mb-4">10. תקופת ההסכם וסיומו</h2>
            <p className="mb-4">10.1 ההסכם נכנס לתוקף במועד ההרשמה ונמשך בהתאם לתקופת המנוי שנבחרה.</p>
            <p className="mb-4">10.2 המנוי מתחדש אוטומטית בתום כל תקופה, אלא אם הלקוח הודיע על ביטול לפחות 14 ימים לפני תום התקופה הנוכחית.</p>
            <p className="mb-4">10.3 בעת סיום ההסכם, הלקוח יהיה זכאי לייצא את כל נתוניו למשך 30 ימים מתום ההסכם. לאחר מכן, הנתונים יימחקו לצמיתות.</p>
            <p className="mb-4">10.4 תנאי ביטול מפורטים מופיעים במדיניות הביטולים וההחזרות המצורפת לתקנון זה.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 11: שירות ותמיכה */}
            <h2 className="text-2xl font-bold mt-12 mb-4">11. שירות ותמיכה</h2>
            <p className="mb-4">11.1 החברה מספקת תמיכה טכנית בימים א&apos;-ה&apos; בשעות 09:00-18:00.</p>
            <p className="mb-4">11.2 פניות דחופות הקשורות לתקלות קריטיות (השבתה מלאה של המערכת) יטופלו בתוך 4 שעות עבודה.</p>
            <p className="mb-4">11.3 פניות רגילות יטופלו בתוך 24 שעות עבודה.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 12: דין חל וסמכות שיפוט */}
            <h2 className="text-2xl font-bold mt-12 mb-4">12. דין חל וסמכות שיפוט</h2>
            <p className="mb-4">12.1 על תקנון זה יחולו דיני מדינת ישראל.</p>
            <p className="mb-4">12.2 סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז הדרום.</p>
            <p className="mb-4">12.3 הצדדים ינסו ליישב כל מחלוקת בדרכי שלום ובמשא ומתן, לפני פנייה להליך משפטי.</p>

            <hr className="border-white/20 my-8" />

            {/* Section 13: יצירת קשר */}
            <h2 className="text-2xl font-bold mt-12 mb-4">13. יצירת קשר</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mt-4">
              <p className="font-semibold text-amber-400 mb-2">אמבר סולושנס סיסטמס</p>
              <p className="mb-2">ת.ז. 323358507 | עוסק פטור</p>
              <p className="mb-2">כתובת: מנחם בגין 10, אשקלון, ישראל</p>
              <p className="mb-2">טלפון: 054-4858586</p>
              <p className="mb-2">דוא&quot;ל: ambersolutions.systems@gmail.com</p>
              <p>אתר: ambersol.co.il</p>
            </div>

          </div>
          )}

          {/* Russian Version */}
          {language === 'ru' && (
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Условия использования — Amber Solutions Systems</h2>
            <h3 className="text-xl font-semibold mb-6 text-amber-400">Система Trinity для управления бизнесом</h3>
            <p className="text-gray-300 mb-8">Последнее обновление: февраль 2026</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">1. Общие положения</h2>
            <p className="mb-4">1.1 Настоящие Условия использования представляют собой обязывающее соглашение между пользователем (далее: &quot;Клиент&quot;) и Amber Solutions Systems, И.Н. 323358507, освобождённый плательщик (далее: &quot;Компания&quot;).</p>
            <p className="mb-4">1.2 Использование системы Trinity (далее: &quot;Система&quot; или &quot;Сервис&quot;) означает полное согласие со всеми условиями настоящего документа.</p>
            <p className="mb-4">1.3 Компания вправе обновлять настоящие Условия. Уведомление о существенных изменениях будет отправлено Клиенту по электронной почте или через систему не менее чем за 14 дней до вступления в силу.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">2. Определения</h2>
            <p className="mb-4">2.1 <strong>&quot;Система&quot;</strong> — облачное программное обеспечение для управления взаимоотношениями с клиентами и операционной деятельностью бизнеса, включая управление очередями, клиентской базой, платежами, инвентарём и сопутствующими услугами.</p>
            <p className="mb-4">2.2 <strong>&quot;Подписка&quot;</strong> — период использования сервиса в соответствии с выбранным Клиентом планом.</p>
            <p className="mb-4">2.3 <strong>&quot;Модуль&quot;</strong> — самостоятельная единица сервиса в системе (например: управление клиентами, платежи, инвентарь и т.д.), которая может быть включена или отключена в соответствии с планом Клиента.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">3. Описание сервиса</h2>
            <p className="mb-4">3.1 Система предоставляет инструменты управления бизнесом, включая: управление клиентской базой, управление визитами и записями, приём онлайн-платежей, управление инвентарём и товарами, отправку сообщений и напоминаний, отчёты и статистику.</p>
            <p className="mb-4">3.2 Компания обязуется обеспечить доступность сервиса 99.9% в среднем за месяц, за исключением плановых технических работ, о которых будет сообщено за 24 часа.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">13. Контакты</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mt-4">
              <p className="font-semibold text-amber-400 mb-2">Amber Solutions Systems</p>
              <p className="mb-2">И.Н. 323358507 | Освобождённый плательщик</p>
              <p className="mb-2">Адрес: Менахем Бегин 10, Ашкелон, Израиль</p>
              <p className="mb-2">Телефон: 054-4858586</p>
              <p className="mb-2">Email: ambersolutions.systems@gmail.com</p>
              <p>Сайт: ambersol.co.il</p>
            </div>
          </div>
          )}

          {/* English Version */}
          {language === 'en' && (
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-4">Terms of Service — Amber Solutions Systems</h2>
            <h3 className="text-xl font-semibold mb-6 text-amber-400">Trinity Business Management System</h3>
            <p className="text-gray-300 mb-8">Last updated: February 2026</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">1. General</h2>
            <p className="mb-4">1.1 These Terms of Service constitute a binding agreement between the user (hereinafter: &quot;Client&quot;) and Amber Solutions Systems, ID 323358507, exempt business (hereinafter: &quot;Company&quot;).</p>
            <p className="mb-4">1.2 Use of the Trinity system (hereinafter: &quot;System&quot; or &quot;Service&quot;) constitutes full acceptance of all terms herein.</p>
            <p className="mb-4">1.3 The Company may update these Terms from time to time. Notice of material changes will be sent to the Client via email or system notification at least 14 days before they take effect.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">2. Definitions</h2>
            <p className="mb-4">2.1 <strong>&quot;System&quot;</strong> — cloud-based software for customer relationship management and business operations, enabling queue management, customer database, payments, inventory, and related services.</p>
            <p className="mb-4">2.2 <strong>&quot;Subscription&quot;</strong> — the period of service use according to the Client&apos;s chosen plan.</p>
            <p className="mb-4">2.3 <strong>&quot;Module&quot;</strong> — an independent service unit within the system (e.g., client management, payments, inventory) that can be enabled or disabled according to the Client&apos;s plan.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">3. Service Description</h2>
            <p className="mb-4">3.1 The System provides business management tools including: customer database management, visit and appointment scheduling, online payment processing, inventory and product management, messaging and reminders, reports and statistics.</p>
            <p className="mb-4">3.2 The Company commits to providing 99.9% service availability on average per month, except for scheduled maintenance announced 24 hours in advance.</p>

            <hr className="border-white/20 my-8" />

            <h2 className="text-2xl font-bold mt-12 mb-4">13. Contact</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mt-4">
              <p className="font-semibold text-amber-400 mb-2">Amber Solutions Systems</p>
              <p className="mb-2">ID 323358507 | Exempt Business</p>
              <p className="mb-2">Address: Menachem Begin 10, Ashkelon, Israel</p>
              <p className="mb-2">Phone: 054-4858586</p>
              <p className="mb-2">Email: ambersolutions.systems@gmail.com</p>
              <p>Website: ambersol.co.il</p>
            </div>
          </div>
          )}

        </div>
      </main>
    </div>
  )
}
