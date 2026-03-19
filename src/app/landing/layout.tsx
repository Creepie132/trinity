/**
 * Landing layout — изолирован от RootLayout.
 * Не подключает ClientProviders / ModalManager / ChatWidget.
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trinity CRM — Система управления для вашего бизнеса',
  description: 'Trinity CRM — всё что нужно малому бизнесу.',
  icons: { icon: '/trinity-logo.png' },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { min-height: unset !important; height: auto !important; }
      `}</style>
      {children}
    </>
  )
}
