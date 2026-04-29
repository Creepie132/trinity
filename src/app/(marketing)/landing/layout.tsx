// Landing layout — minimal, parent (marketing)/layout.tsx уже объявил <html lang="ru" dir="ltr">
// force-dynamic + revalidate=0: предотвращают Vercel edge-кеш

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LandingRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
