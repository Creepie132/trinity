// Route group layout для маркетинговых страниц.
// НЕ объявляет <html> — root layout.tsx единственный источник <html>.
// Изоляция лендинга достигается через root layout по pathname из headers().

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
