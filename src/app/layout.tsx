import type { Metadata } from "next";
import { Inter, Assistant } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ 
  subsets: ["latin", "cyrillic"], 
  display: 'swap',
  variable: '--font-inter',
});
const assistant = Assistant({ 
  subsets: ["hebrew", "latin"], 
  display: 'swap',
  variable: '--font-assistant',
});

const BASE_URL = 'https://ambersol.co.il'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Trinity CRM | מערכת ניהול לקוחות לעסקים קטנים בישראל',
    template: '%s | Trinity CRM',
  },
  description: 'Trinity CRM — מערכת ניהול לקוחות, תורים, תשלומים והודעות WhatsApp לעסקים קטנים בישראל. סלוני יופי, קליניקות, מוסכים ועוד. הפעלה תוך יום אחד.',
  keywords: [
    'CRM ישראל', 'מערכת ניהול לקוחות', 'ניהול תורים', 'WhatsApp עסקי',
    'סלון יופי תוכנה', 'Trinity CRM', 'Amber Solutions', 'crm לעסקים קטנים',
    'CRM салон красоты', 'CRM Израиль', 'система записи клиентов',
  ],
  authors: [{ name: 'Amber Solutions', url: BASE_URL }],
  creator: 'Amber Solutions',
  publisher: 'Amber Solutions',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    alternateLocale: ['ru_RU', 'en_US'],
    url: BASE_URL,
    siteName: 'Trinity CRM',
    title: 'Trinity CRM | מערכת ניהול לקוחות לעסקים קטנים',
    description: 'ניהול לקוחות, תורים ו-WhatsApp בפלטפורמה אחת. הפעלה תוך יום אחד.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Trinity CRM — מערכת ניהול לקוחות',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trinity CRM | מערכת ניהול לקוחות',
    description: 'ניהול לקוחות, תורים ו-WhatsApp בפלטפורמה אחת.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      'he-IL': `${BASE_URL}/`,
      'ru-RU': `${BASE_URL}/`,
    },
  },
  icons: {
    icon: '/logo.png',
    apple: '/icons/icon-192.png',
    shortcut: '/logo.png',
  },
  verification: {
    google: 'TWdfL_u_VuTW1uGlwmo80fC1YhcNKfSZxfiqiuimEA4',
  },
};

// JSON-LD Schema for SoftwareApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Trinity CRM',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  url: BASE_URL,
  description: 'מערכת ניהול לקוחות, תורים, תשלומים והודעות WhatsApp לעסקים קטנים בישראל.',
  screenshot: `${BASE_URL}/og-image.png`,
  offers: [
    {
      '@type': 'Offer',
      price: '199',
      priceCurrency: 'ILS',
      name: 'Trinity CRM Base',
      description: 'ניהול לקוחות, תורים ומלאי',
    },
    {
      '@type': 'Offer',
      price: '249',
      priceCurrency: 'ILS',
      name: 'Trinity CRM Pro',
      description: 'כולל WhatsApp, סטטיסטיקות ואנליטיקה',
    },
  ],
  author: {
    '@type': 'Organization',
    name: 'Amber Solutions',
    url: BASE_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      availableLanguage: ['Hebrew', 'Russian'],
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '2',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'ניהול לקוחות',
    'יומן תורים',
    'WhatsApp תזכורות',
    'ניהול מלאי',
    'מעקב תשלומים',
    'אנליטיקה ודוחות',
  ],
  inLanguage: ['he', 'ru', 'en'],
  isAccessibleForFree: false,
  softwareVersion: '2.0',
  applicationSubCategory: 'CRM',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Читаем locale из cookie — синхронный SSR, без DB запроса
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('trinity_locale')?.value;
  const locale = localeCookie === 'ru' ? 'ru' : 'he';
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="light" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://tjryzcqvsavtllahjyrj.supabase.co" />
        <link rel="dns-prefetch" href="https://tjryzcqvsavtllahjyrj.supabase.co" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Trinity" />
        {/* Language flash prevention — runs before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('trinity-language');if(l==='ru'){document.documentElement.setAttribute('lang','ru');document.documentElement.setAttribute('dir','ltr');document.documentElement.classList.remove('font-assistant');document.documentElement.classList.add('font-inter');}}catch(e){}})();`,
          }}
        />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${assistant.variable} font-sans`} suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider initialLocale={locale}>
            {children}
            <Toaster 
              position="bottom-center" 
              closeButton 
              richColors
              toastOptions={{
                style: {
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                },
                classNames: {
                  toast: 'backdrop-blur-sm bg-opacity-95',
                  error: 'bg-red-50 border-red-200',
                  success: 'bg-green-50 border-green-200',
                  warning: 'bg-yellow-50 border-yellow-200',
                  info: 'bg-blue-50 border-blue-200',
                }
              }}
            />
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
