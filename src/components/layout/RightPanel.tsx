'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, Megaphone, Bell, ExternalLink } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useKiraRealtime } from '@/hooks/useKiraRealtime'
import { useLanguage } from '@/contexts/LanguageContext'
import type { KiraWaveState } from '@/components/kira/KiraWave'
const KiraWave = dynamic(() => import('@/components/kira/KiraWave').then(m => ({ default: m.KiraWave })), { ssr: false })

// ─── Типы ────────────────────────────────────────────────────────────────────
interface Announcement { id: string; text: string; type: 'info' | 'success' | 'warning' }

// ─── Объявления (статичные пока нет API) ─────────────────────────────────────
const ANNOUNCEMENTS: Announcement[] = [
  { id: '1', text: '🚀 Новая функция: WhatsApp уведомления скоро!', type: 'info' },
  { id: '2', text: '✨ Кира AI — ваш личный ассистент в разработке', type: 'success' },
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
  const colors = { info: 'bg-blue-50 border-blue-200 text-blue-700', success: 'bg-emerald-50 border-emerald-200 text-emerald-700', warning: 'bg-amber-50 border-amber-200 text-amber-700' }

  return (
    <div className={`rounded-xl border px-3 py-2.5 transition-all duration-400 ${colors[item.type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
      <div className="flex items-start gap-2">
        <Bell className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">{item.text}</p>
      </div>
      {/* Dot progress */}
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
          // Pick random campaign if multiple
          const idx = Math.floor(Math.random() * d.campaigns.length)
          setAd(d.campaigns[idx])
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Placeholder while loading
  if (!loaded) return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="w-full h-28 bg-gray-100 dark:bg-slate-700" />
      <div className="p-3 bg-white dark:bg-slate-800">
        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  )

  // No campaigns — show promo slot
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

// ─── Слот Киры — звуковая волна + Realtime ───────────────────────────────────
function KiraBlock() {
  const [state, setState] = useState<KiraWaveState>('idle')

  // Supabase Realtime — реагируем на реальные события
  const handleStateChange = useCallback((s: KiraWaveState) => setState(s), [])
  useKiraRealtime({ onStateChange: handleStateChange })

  const stateLabel: Record<KiraWaveState, string> = {
    idle:     'Слушаю...',
    sale:     '🎉 Продажа!',
    client:   '👤 Новый клиент!',
    thinking: 'Думает...',
    payment:  '💳 Платёж!',
    visit:    '📅 Визит',
    cancel:   '❌ Отмена',
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: '#2a2d35' }}>
      {/* Волна */}
      <div className="relative flex items-center justify-center px-2 pt-5 pb-3"
        style={{ background: '#2a2d35' }}>
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 50% 80%, rgba(40,80,255,0.3) 0%, transparent 70%)'
        }} />
        <KiraWave state={state} width={224} height={72} />
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            state === 'idle' ? 'bg-blue-400' :
            state === 'payment' ? 'bg-purple-400' :
            state === 'client' ? 'bg-amber-400' :
            state === 'visit' ? 'bg-cyan-400' :
            state === 'cancel' ? 'bg-gray-400' :
            'bg-green-400'
          }`} />
          <span className="text-xs transition-all duration-300" style={{ color: 'rgba(100,150,255,0.6)' }}>
            {stateLabel[state]}
          </span>
        </div>
      </div>
      {/* Подпись */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(100,160,255,0.7)' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(140,180,255,0.6)' }}>
            AI Ассистент Кира
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Личный ИИ-помощник для вашего бизнеса
        </p>
      </div>
    </div>
  )
}


// ─── Главная правая/левая панель ──────────────────────────────────────────────
export function RightPanel() {
  const { language } = useLanguage()
  const isRTL = language === 'he'

  // В иврите (RTL) панель — слева, после основного контента в flex-row-reverse
  // В русском (LTR) — справа (обычный порядок)
  // Реализация: border меняется, порядок управляется через order в DashboardShell
  const borderClass = isRTL
    ? 'border-r border-gray-100 dark:border-slate-800'
    : 'border-l border-gray-100 dark:border-slate-800'

  const titleLabel = isRTL ? 'עדכונים' : 'Обновления'

  return (
    <aside className={`hidden xl:flex xl:flex-col xl:w-72 xl:flex-shrink-0 sticky top-0 h-screen overflow-y-auto ${borderClass} bg-white/80 dark:bg-slate-900/80 z-[0]`}
      style={{ order: isRTL ? -1 : 1 }}>
      <div className="flex flex-col h-full p-4 gap-4">

        {/* Заголовок */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {titleLabel}
          </h2>
        </div>

        {/* Бегущая строка объявлений */}
        <Ticker items={ANNOUNCEMENTS} />

        {/* Слот Киры */}
        <KiraBlock />

        {/* Рекламный баннер */}
        <AdBlock />

        {/* Прижимаем подпись к низу */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center">
            Trinity CRM by Amber Solutions
          </p>
        </div>

      </div>
    </aside>
  )
}
