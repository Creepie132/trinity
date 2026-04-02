import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trinity CRM | מערכת ניהול לקוחות לעסקים קטנים בישראל',
  description: 'Trinity CRM — מערכת ניהול לקוחות, תורים, תשלומים ו-WhatsApp לעסקים בישראל. סלוני יופי, קליניקות, מוסכים. הפעלה תוך יום אחד, ללא עמלות נסתרות.',
  openGraph: {
    title: 'Trinity CRM | מערכת ניהול לקוחות',
    description: 'ניהול לקוחות, תורים ו-WhatsApp בפלטפורמה אחת.',
    url: 'https://ambersol.co.il',
    type: 'website',
  },
  alternates: {
    // canonical указывает на корень — именно он будет в индексе Google
    canonical: 'https://ambersol.co.il',
  },
}
