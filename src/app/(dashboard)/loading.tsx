/**
 * (dashboard)/loading.tsx
 *
 * Этот файл — fallback только для контентной области (children),
 * НЕ для sidebar и header. Sidebar и header рендерятся в layout.tsx
 * и НЕ перерендериваются при смене маршрута.
 *
 * Минималистичный индикатор — не перекрывает весь экран,
 * показывается внутри main-scroll контейнера.
 */
export default function Loading() {
  return (
    <div className="w-full py-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-gray-400">טוען...</p>
      </div>
    </div>
  )
}
