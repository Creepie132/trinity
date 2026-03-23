'use client'

/**
 * DemoLimitModal — анимированное окно достижения лимита в демо-режиме.
 * Показывается при попытке добавить запись сверх лимита.
 * Содержит: описание планов + кнопку WhatsApp.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, Check, MessageCircle, Zap, Star, Crown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface DemoLimitModalProps {
  open: boolean
  onClose: () => void
  section: 'clients' | 'visits' | 'inventory' | 'diary'
}

const WA_LINK = 'https://wa.me/972544858586'

const T = {
  ru: {
    clients:   { title: 'Достигнут лимит клиентов', desc: 'В демо-версии можно добавить до 10 клиентов.' },
    visits:    { title: 'Достигнут лимит визитов',   desc: 'В демо-версии можно создать до 15 визитов (3 одновременно).' },
    inventory: { title: 'Достигнут лимит склада',    desc: 'В демо-версии можно добавить до 5 товаров.' },
    diary:     { title: 'Достигнут лимит дневника',  desc: 'В демо-версии можно вести до 5 записей одновременно.' },
    upgrade: 'Чтобы снять ограничения — выберите план:',
    wa: 'Написать в WhatsApp',
    close: 'Закрыть',
    plans: [
      { name: 'Старт',      price: '₪149/мес', icon: Zap,    color: 'from-blue-500 to-cyan-500',     features: ['До 100 клиентов', 'До 200 визитов/мес', 'Базовая аналитика'] },
      { name: 'Бизнес',     price: '₪299/мес', icon: Star,   color: 'from-violet-500 to-purple-600', features: ['Неограниченно', 'WhatsApp авто-напоминания', 'Полная аналитика', 'Чеки Green Invoice'] },
      { name: 'Про',        price: 'по запросу', icon: Crown, color: 'from-amber-500 to-orange-500',  features: ['Всё из Бизнеса', 'Несколько филиалов', 'Приоритетная поддержка', 'Брендирование'] },
    ],
  },
  he: {
    clients:   { title: 'הגעת למגבלת הלקוחות',   desc: 'בגרסת הדמו ניתן להוסיף עד 10 לקוחות.' },
    visits:    { title: 'הגעת למגבלת הביקורים',   desc: 'בגרסת הדמו ניתן ליצור עד 15 ביקורים (3 בו-זמנית).' },
    inventory: { title: 'הגעת למגבלת המלאי',      desc: 'בגרסת הדמו ניתן להוסיף עד 5 מוצרים.' },
    diary:     { title: 'הגעת למגבלת היומן',      desc: 'בגרסת הדמו ניתן לנהל עד 5 רשומות בו-זמנית.' },
    upgrade: 'כדי להסיר את המגבלות — בחר תוכנית:',
    wa: 'כתוב לנו ב-WhatsApp',
    close: 'סגור',
    plans: [
      { name: 'סטארט',    price: '₪149/חודש', icon: Zap,    color: 'from-blue-500 to-cyan-500',     features: ['עד 100 לקוחות', 'עד 200 ביקורים/חודש', 'ניתוח בסיסי'] },
      { name: 'עסקי',     price: '₪299/חודש', icon: Star,   color: 'from-violet-500 to-purple-600', features: ['ללא הגבלה', 'תזכורות WhatsApp אוטומטיות', 'ניתוח מלא', 'חשבוניות Green Invoice'] },
      { name: 'פרו',      price: 'לפי בקשה',  icon: Crown,  color: 'from-amber-500 to-orange-500',  features: ['כל מה שיש בעסקי', 'סניפים מרובים', 'תמיכה מועדפת', 'מיתוג מותאם'] },
    ],
  },
}

export function DemoLimitModal({ open, onClose, section }: DemoLimitModalProps) {
  const { language } = useLanguage()
  const t = T[language as 'ru' | 'he'] ?? T.ru
  const s = t[section]
  const [shimmer, setShimmer] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) { setTimeout(() => setVisible(true), 10) }
    else setVisible(false)
  }, [open])

  useEffect(() => {
    const id = setInterval(() => { setShimmer(true); setTimeout(() => setShimmer(false), 600) }, 2800)
    return () => clearInterval(id)
  }, [])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-400 to-red-500 animate-pulse"/>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-red-50 to-orange-50">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all shadow-sm">
            <X size={15}/>
          </button>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-red-200 animate-ping opacity-30"/>
              <div className="relative w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center border-2 border-red-200">
                <span className="text-3xl">🚫</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{s.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.upgrade}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {t.plans.map((plan, i) => {
              const Icon = plan.icon
              return (
                <div key={i} className={`relative rounded-2xl p-3 bg-gradient-to-br ${plan.color} text-white overflow-hidden`}>
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-white/10"/>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                      <Icon size={16} className="text-white"/>
                    </div>
                    <p className="font-bold text-sm leading-tight">{plan.name}</p>
                    <p className="text-[11px] opacity-80 mb-2">{plan.price}</p>
                    <ul className="space-y-0.5">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-1 text-[10px] opacity-90 leading-tight">
                          <Check size={9} className="flex-shrink-0 mt-0.5"/>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* WhatsApp CTA */}
        <div className="px-6 pb-6">
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            className="relative group flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl overflow-hidden font-bold text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <span className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 ${shimmer ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}/>
            <span className="absolute inset-0 rounded-2xl border-2 border-green-300/60 animate-pulse pointer-events-none"/>
            <MessageCircle size={20}/>
            <span>{t.wa}</span>
          </a>
        </div>
      </div>
    </div>
  ), document.body
  )
}
