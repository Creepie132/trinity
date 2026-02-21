'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white" dir="rtl">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="חזרה"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">מדיניות ביטולים ופרטיות</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 lg:p-12 border border-white/10">
          
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
        </div>
      </main>
    </div>
  )
}
