import { LandingLangProvider } from '@/contexts/LandingLangContext'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function TrinityLandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingLangProvider>
      {children}
    </LandingLangProvider>
  )
}
