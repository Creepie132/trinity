// Landing layout is handled by root layout.tsx via trinity_page cookie isolation.
// This file intentionally minimal — no html/body wrapping needed here.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
