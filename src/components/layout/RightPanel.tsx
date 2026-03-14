'use client'

import { useEffect, useState, useRef } from 'react'
import { Sparkles, Megaphone, Bell, ExternalLink } from 'lucide-react'
import dynamic from 'next/dynamic'
const KiraFace = dynamic(() => import('@/components/kira/KiraOrb3D').then(m => ({ default: m.KiraOrb3D })), { ssr: false })

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

// ─── Слот Киры — тёмное окно ─────────────────────────────────────────────────
function KiraBlock() {
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'speaking'>('idle')

  useEffect(() => {
    const moods: Array<'idle' | 'happy' | 'thinking'> = ['idle', 'idle', 'happy', 'thinking', 'idle']
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % moods.length
      setMood(moods[i])
    }, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(160deg, #0a0e1a 0%, #0d1224 50%, #0f1530 100%)' }}>
      {/* Орб */}
      <div className="relative flex items-center justify-center pt-5 pb-3">
        {/* Фоновое свечение */}
        <div className="absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(circle at 50% 60%, rgba(30,60,255,0.25) 0%, transparent 70%)'
        }} />
        <KiraFace size={160} mood={mood} />
        {/* Статус */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs text-blue-300/50">
            {mood === 'thinking' ? 'Думает...' : mood === 'happy' ? 'Рада видеть!' : 'Скоро'}
          </span>
        </div>
      </div>
      {/* Подпись */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wide text-blue-300/70">AI Ассистент Кира</span>
        </div>
        <p className="text-xs text-white/30 leading-relaxed">
          Личный ИИ-помощник для вашего бизнеса
        </p>
      </div>
    </div>
  )
}


// ─── Главная правая панель ────────────────────────────────────────────────────
export function RightPanel() {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-72 xl:flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="p-4 space-y-4">

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

        {/* Разделитель */}
        <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center">
            Trinity CRM by Amber Solutions
          </p>
        </div>

      </div>
    </aside>
  )
}
