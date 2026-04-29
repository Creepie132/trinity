// Route group layout для маркетинговых страниц (лендинг, pricing и др.)
// Объявляет собственный <html> — изолирован от root layout Trinity.
// Это устраняет hydration mismatch #418: Next.js App Router использует
// разные layout-деревья для разных route groups, никаких headers() хаков не нужно.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Базовые мета перекрываются в конкретных страницах через их metadata export
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        background: '#080810',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        direction: 'ltr',
      }}>
        {children}
      </body>
    </html>
  )
}
