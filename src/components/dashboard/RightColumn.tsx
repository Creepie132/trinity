'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WidgetCard } from '@/components/ui/WidgetCard'
import { UserPlus, CreditCard, ListPlus, Zap, Megaphone, Sparkles, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Ad {
  id: string; title: string; description: string
  image_url: string | null; link_url: string | null; button_text: string | null
}

// ─── Быстрые действия ─────────────────────────────────────────────────────────
function QuickActions({ locale }: { locale: string }) {
  const l = locale === 'he'
  const router = useRouter()

  const actions = [
    { icon: UserPlus, label: l ? 'לקוח חדש' : 'Новый клиент', onClick: () => router.push('/clients?action=new'), gradient: 'from-blue-500 to-indigo-500' },
    { icon: CreditCard, label: l ? 'מכירה חדשה' : 'Новая продажа', onClick: () => router.push('/payments?action=new'), gradient: 'from-emerald-500 to-teal-500' },
    { icon: ListPlus, label: l ? 'משימה חדשה' : 'Новая задача', onClick: () => router.push('/diary?action=new'), gradient: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Zap className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {l ? 'פעולות מהירות' : 'Быстрые действия'}
        </h3>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-indigo-200 hover:shadow-sm transition-all duration-150 active:scale-[0.97] group text-left">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
              <a.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


// ─── Рекламный баннер ─────────────────────────────────────────────────────────
function AdBanner({ locale, category }: { locale: string; category: string }) {
  const l = locale === 'he'
  const [ad, setAd] = useState<Ad | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ads/active?category=${category}`)
      .then(r => r.json())
      .then(d => { if (d.campaigns?.length > 0) setAd(d.campaigns[0]) })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Click impression
    if (ad?.id) {
      fetch('/api/ads/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: ad.id }),
      }).catch(() => {})
    }
  }, [category])

  if (loading || !ad) return null

  const handleClick = () => {
    if (ad.link_url) {
      fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: ad.id }),
      }).catch(() => {})
      window.open(ad.link_url, '_blank')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Megaphone className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {l ? 'מהשותפים שלנו' : 'От наших партнёров'}
        </h3>
      </div>
      <button onClick={handleClick}
        className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left group">
        {ad.image_url && (
          <img src={ad.image_url} alt={ad.title}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="p-3 bg-white dark:bg-slate-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ad.title}</p>
          {ad.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ad.description}</p>}
          {ad.button_text && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600">
              {ad.button_text}
              <ExternalLink className="w-3 h-3" />
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Слот Киры (заглушка до запуска AI агента) ────────────────────────────────
function KiraSlot({ locale }: { locale: string }) {
  const l = locale === 'he'
  return (
    <div className="rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
          {l ? 'עוזרת AI' : 'AI Ассистент'}
        </span>
      </div>
      <p className="text-xs text-indigo-500 dark:text-indigo-400">
        {l ? 'קירה — עוזרת ה-AI האישית שלך — בקרוב!' : 'Кира — ваш личный AI ассистент — скоро!'}
      </p>
      <div className="mt-3 flex gap-1">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full bg-indigo-200 dark:bg-indigo-700 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Главный компонент правой колонки ─────────────────────────────────────────
interface RightColumnProps {
  locale: string
  category?: string
}

export function RightColumn({ locale, category = 'beauty' }: RightColumnProps) {
  return (
    <div className="space-y-5 sticky top-6">
      <QuickActions locale={locale} />
      <AdBanner locale={locale} category={category} />
      <KiraSlot locale={locale} />
    </div>
  )
}
