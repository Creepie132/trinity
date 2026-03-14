'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, Megaphone, Bell, ExternalLink } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useKiraRealtime } from '@/hooks/useKiraRealtime'
import type { KiraWaveState } from '@/components/kira/KiraWave'
const KiraWave = dynamic(() => import('@/components/kira/KiraWave').then(m => ({ default: m.KiraWave })), { ssr: false })

// ─── Типы ────────────────────────────────────────────────────────────────────
interface Ad { id: string; title: string; description: string; image_url: string | null; link_url: string | null; button_text: string | null }
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
function AdBlock() {
  const [ad, setAd] = useState<Ad | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/ads/active?category=beauty')
      .then(r => r.json())
      .then(d => { if (d.campaigns?.length) setAd(d.campaigns[0]) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Если нет рекламы — показываем промо-заглушку
  if (loaded && !ad) return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
      <Megaphone className="w-6 h-6 text-gray-300 mx-auto mb-2" />
      <p className="text-xs text-gray-400 font-medium">Место для рекламы</p>
      <p className="text-xs text-gray-300 mt-1">Ваш баннер здесь</p>
    </div>
  )

  if (!ad) return null

  const handleClick = () => {
    if (!ad.link_url) return
    fetch('/api/ads/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: ad.id }) }).catch(() => {})
    window.open(ad.link_url, '_blank')
  }

  return (
    <button onClick={handleClick}
      className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left group">
      {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300" />}
      <div className="p-3 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs text-gray-400">Реклама</span>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ad.title}</p>
        {ad.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ad.description}</p>}
        {ad.button_text && (
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600">
            {ad.button_text} <ExternalLink className="w-3 h-3" />
          </div>
        )}
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


// ─── Главная правая панель ────────────────────────────────────────────────────
export function RightPanel() {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-72 xl:flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
      <div className="flex flex-col h-full p-4 gap-4">

        {/* Заголовок */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Обновления
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
