import type { Metadata } from "next";
import { Inter, Assistant } from "next/font/google";
import "./globals.css";
import { cookies, headers } from "next/headers";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/providers/PWARegister";
import { getUserPreferences } from "@/actions/user-preferences";

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
  // Приоритет источников языка (чтобы веб и PWA были синхронизированы через БД):
  //   1. БД (org_users.preferred_language) — истина для залогиненного пользователя
  //   2. cookie trinity_locale — fallback для гостей и для быстрого SSR без DB-запроса
  //   3. 'he' — дефолт
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('trinity_locale')?.value;

  let locale: 'he' | 'ru' = localeCookie === 'ru' ? 'ru' : 'he';

  // Читаем из БД только если юзер залогинен. getUserPreferences() вернёт {} если нет auth.
  // Не падаем на любой ошибке — cookie-fallback выше уже применён.
  try {
    const prefs = await getUserPreferences();
    if (prefs.preferred_language === 'ru' || prefs.preferred_language === 'he') {
      locale = prefs.preferred_language;
      // Если cookie отстаёт от БД (другое устройство / PWA) — обновляем, чтобы
      // следующий SSR работал без DB-запроса. Тихо ошибку игнорируем.
      if (localeCookie !== locale) {
        try {
          cookieStore.set('trinity_locale', locale, {
            maxAge: 60 * 60 * 24 * 365,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        } catch { /* Server Component read-only cookie store в некоторых ветках Next 16 */ }
      }
    }
  } catch { /* нет auth или DB недоступна — используем cookie */ }

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  // Лендинг — полная изоляция: ltr, inter, без Trinity-провайдеров.
  // Проверяем ВСЕ возможные источники pathname в SSR:
  const hdrs = await headers();
  const pathCandidates = [
    hdrs.get('x-trinity-page') === 'landing' ? '/landing' : '',
    hdrs.get('x-invoke-path') ?? '',
    hdrs.get('next-url') ?? '',
    hdrs.get('x-url') ?? '',
    hdrs.get('x-pathname') ?? '',
    hdrs.get('referer') ?? '',
  ];
  const isLandingByPath = pathCandidates.some(p => p.includes('/landing'));
  const isLandingByCookie = cookieStore.get('trinity_page')?.value === 'landing';
  const isLanding = isLandingByPath || isLandingByCookie;
  if (isLanding) {
    return (
      <html lang="ru" dir="ltr" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body style={{ margin: 0, padding: 0, background: '#080810', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
          {children}
        </body>
      </html>
    );
  }

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
        {/*
          Flash-prevention script удалён намеренно.
          Ранее он читал localStorage и принудительно переключал lang/dir на клиенте,
          что ломало синхронизацию между веб и PWA (localStorage не делится между ними).
          Теперь SSR читает язык из БД (org_users.preferred_language) и отдаёт
          правильные lang/dir с первого байта — никакого flash'а нет.
          LanguageProvider синкает localStorage с SSR-значением при mount.
        */}
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
