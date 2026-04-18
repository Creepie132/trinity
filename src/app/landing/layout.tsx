// Landing layout is handled by root layout.tsx via trinity_page cookie isolation.
// This file intentionally minimal — no html/body wrapping needed here.

// КРИТИЧНО: форсируем динамический рендеринг страницы `/landing`.
// Без этого Next.js генерирует prerendered static HTML, а Vercel edge-cache
// хранит его неделями, игнорируя новые деплои. При изменениях лендинга
// пользователи продолжали видеть старую версию даже после `git push`.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
