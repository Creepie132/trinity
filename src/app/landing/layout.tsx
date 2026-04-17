import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trinity CRM — Система управления бизнесом | Израиль',
  description: 'Trinity — нервная система вашего бизнеса. Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте.',
  icons: { icon: '/trinity-logo.png' },
  openGraph: {
    title: 'Trinity CRM — Система управления бизнесом',
    description: 'Клиенты, записи, аналитика и WhatsApp-напоминания в одном месте.',
    images: ['/trinity-logo.png'],
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#080810', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
