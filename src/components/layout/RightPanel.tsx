'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Bell, ExternalLink } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBranch } from '@/contexts/BranchContext'
import { useOrganization } from '@/hooks/useOrganization'

const KiraChatPanel = dynamic(
  () => import('@/components/kira/KiraChatPanel').then(m => ({ default: m.KiraChatPanel })),
  { ssr: false }
)

// ─── Типы ────────────────────────────────────────────────────────────────────
interface Announcement { id: string; text: string; type: 'info' | 'success' | 'warning' }

// ─── Объявления ───────────────────────────────────────────────────────────────
const ANNOUNCEMENTS: Announcement[] = [
  { id: '1', text: '🚀 Новая функция: WhatsApp уведомления скоро!', type: 'info' },
  { id: '2', text: '✨ Кира AI — ваш личный ассистент теперь активен', type: 'success' },
  { id: '3', text: '📱 Установите приложение на телефон!', type: 'info' },
]


// ─── Бегущая строка ───────────────────────────────────────────────────────────
function Ticker({ items }: { items: Announcement[] }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length)
        setVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(t)
  }, [items.length])

  if (!items.length) return null
  const item = items[idx]
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  }

  return (
    <div className={`rounded-xl border px-3 py-2.5 transition-all duration-400 ${colors[item.type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
      <div className="flex items-start gap-2">
        <Bell className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">{item.text}</p>
      </div>
      {items.length > 1 && (
        <div className="flex gap-1 mt-2 justify-center">
          {items.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-current opacity-60' : 'w-1 bg-current opacity-20'}`} />
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Рекламный баннер ─────────────────────────────────────────────────────────
interface AdCampaign {
  id: string
  advertiser_name: string
  banner_url: string
  link_url: string
  target_categories: string[]
  is_active: boolean
}

function AdBlock() {
  const [ad, setAd] = useState<AdCampaign | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/ads/active?category=')
      .then(r => r.json())
      .then(d => {
        if (d.campaigns?.length) {
          const idx = Math.floor(Math.random() * d.campaigns.length)
          setAd(d.campaigns[idx])
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="w-full h-28 bg-gray-100 dark:bg-slate-700" />
      <div className="p-3 bg-white dark:bg-slate-800">
        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  )

  if (!ad) return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
      <Megaphone className="w-6 h-6 text-gray-300 mx-auto mb-2" />
      <p className="text-xs text-gray-400 font-medium">Место для рекламы</p>
      <p className="text-xs text-gray-300 mt-1">Ваш баннер здесь</p>
    </div>
  )


  const handleClick = () => {
    if (!ad.link_url) return
    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: ad.id })
    }).catch(() => {})
    window.open(ad.link_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-all duration-300 active:scale-[0.98] text-left group"
    >
      {ad.banner_url && (
        <div className="relative overflow-hidden">
          <img
            src={ad.banner_url}
            alt={ad.advertiser_name}
            className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      <div className="p-3 bg-white dark:bg-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400">
            פרסומת
          </span>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[120px]">
            {ad.advertiser_name}
          </p>
        </div>
        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 transition-colors duration-200 flex-shrink-0" />
      </div>
    </button>
  )
}


// ─── Главная правая/левая панель ──────────────────────────────────────────────
export function RightPanel() {
  const { language } = useLanguage()
  const { activeOrgId } = useBranch()
  const { data: org } = useOrganization()
  const isRTL = language === 'he'

  // kira module flag — если явно false, блокируем. По умолчанию включено
  const kiraEnabled = org?.features?.modules?.kira !== false

  const borderClass = isRTL
    ? 'border-r border-gray-100 dark:border-slate-800'
    : 'border-l border-gray-100 dark:border-slate-800'

  const titleLabel = isRTL ? 'עדכונים' : 'Обновления'

  return (
    <aside className={`hidden 2xl:flex 2xl:flex-col 2xl:w-72 2xl:flex-shrink-0 sticky top-0 h-screen overflow-y-auto ${borderClass} bg-white/80 dark:bg-slate-900/80 z-[0]`}>
      <div className="flex flex-col h-full p-4 gap-4">

        {/* Заголовок */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {titleLabel}
          </h2>
        </div>

        {/* Бегущая строка */}
        <Ticker items={ANNOUNCEMENTS} />

        {/* Кира AI — чат */}
        {activeOrgId && <KiraChatPanel orgId={activeOrgId} kiraEnabled={kiraEnabled} />}

        {/* Рекламный баннер */}
        <AdBlock />

        {/* Подпись */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center">
            Trinity CRM by Amber Solutions
          </p>
        </div>

      </div>
    </aside>
  )
}
