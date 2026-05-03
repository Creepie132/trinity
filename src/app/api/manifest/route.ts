import { NextRequest, NextResponse } from 'next/server'

// ─── Локализованные строки манифеста ────────────────────────────────────────
// Чтобы добавить язык — достаточно добавить ключ сюда, всё остальное подтянется.
const MANIFEST_I18N = {
  he: {
    name:        'Trinity CRM | ניהול עסק',
    short_name:  'Trinity',
    description: 'מערכת ניהול לקוחות, תורים ותשלומים לעסקים קטנים בישראל',
    dir:         'rtl' as const,
    lang:        'he',
    shortcuts: [
      { name: 'לקוחות',  short_name: 'לקוחות',  url: '/clients'  },
      { name: 'יומן',     short_name: 'יומן',     url: '/visits'   },
      { name: 'תשלומים', short_name: 'תשלומים', url: '/payments' },
    ],
  },
  ru: {
    name:        'Trinity CRM | Управление бизнесом',
    short_name:  'Trinity',
    description: 'CRM-система для малого бизнеса в Израиле: клиенты, записи, платежи',
    dir:         'ltr' as const,
    lang:        'ru',
    shortcuts: [
      { name: 'Клиенты', short_name: 'Клиенты', url: '/clients'  },
      { name: 'Визиты',  short_name: 'Визиты',  url: '/visits'   },
      { name: 'Платежи', short_name: 'Платежи', url: '/payments' },
    ],
  },
} as const

type SupportedLocale = keyof typeof MANIFEST_I18N

// Бесшовный fallback: любой невалидный/отсутствующий cookie → 'he'
function resolveLocale(raw: string | undefined): SupportedLocale {
  if (raw === 'ru' || raw === 'he') return raw
  return 'he'
}

// Иконки и скриншоты не зависят от языка
const ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'      },
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'      },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

const SCREENSHOTS = [
  {
    src: '/screenshot-1.jpg', sizes: '1280x800', type: 'image/jpeg',
    form_factor: 'wide',   label: 'Trinity CRM Dashboard',
  },
  {
    src: '/screenshot-2.jpg', sizes: '390x844',  type: 'image/jpeg',
    form_factor: 'narrow', label: 'Trinity CRM Mobile',
  },
]

export async function GET(req: NextRequest) {
  // trinity_locale — cookie, которую layout.tsx / setLocaleCookie() уже ставят
  // при каждом рендере. При первом посещении до логина — 'he' по умолчанию.
  const rawLocale = req.cookies.get('trinity_locale')?.value
  const locale    = resolveLocale(rawLocale)
  const i18n      = MANIFEST_I18N[locale]

  const manifest = {
    name:        i18n.name,
    short_name:  i18n.short_name,
    description: i18n.description,
    lang:        i18n.lang,
    dir:         i18n.dir,
    start_url:   '/pwa-start',
    scope:       '/',
    display:     'standalone',
    background_color: '#ffffff',
    theme_color:      '#6366f1',
    orientation: 'portrait',
    prefer_related_applications: false,
    icons:       ICONS,
    screenshots: SCREENSHOTS,
    shortcuts:   i18n.shortcuts.map(s => ({
      ...s,
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
    })),
  }

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      // must-revalidate: браузер перепроверяет манифест при каждом запуске PWA.
      // Это гарантирует, что смена языка пользователем попадёт в следующую сессию.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
