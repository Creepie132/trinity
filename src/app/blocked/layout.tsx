import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'גישה מושעית | Trinity',
  description: 'חשבון הארגון שלך הושעה',
}

export default function BlockedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
