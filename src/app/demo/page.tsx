'use client'

import { useState } from 'react'
import { Sparkles, CheckCircle, ChevronRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const FEATURES = [
  { he: 'ניהול לקוחות ותורים', ru: 'Клиенты и записи' },
  { he: 'תשלומים והוראת קבע', ru: 'Платежи и абонементы' },
  { he: 'מלאי ומכירות', ru: 'Склад и продажи' },
  { he: 'אנליטיקה ודוחות', ru: 'Аналитика' },
  { he: 'הזמנה אונליין', ru: 'Онлайн запись' },
  { he: 'תמיכה בעברית ורוסית', ru: 'Поддержка на иврите и русском' },
]

export default function DemoPage() {
  const [lang, setLang] = useState<'he' | 'ru'>('he')
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const he = lang === 'he'

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"/>

      {/* Lang switcher */}
      <div className="absolute top-6 end-6">
        <button onClick={() => setLang(l => l === 'he' ? 'ru' : 'he')}
          className="text-sm text-white/60 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg transition-colors">
          {he ? 'Русский' : 'עברית'}
        </button>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles size={24} className="text-white"/>
        </div>
        <span className="text-2xl font-bold">Trinity CRM</span>
      </div>

      {/* Hero text */}
      <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 leading-tight">
        {he ? 'התחילו עם Trinity' : 'Начните с Trinity'}
      </h1>
      <p className="text-xl text-white/70 text-center mb-10 max-w-lg">
        {he ? 'מערכת CRM מקצועית לעסקים קטנים ובינוניים בישראל. בחרו את המודולים שאתם צריכים ושלמו רק עבורם.'
             : 'Профессиональная CRM для малого бизнеса в Израиле. Выберите нужные модули и платите только за них.'}
      </p>

      {/* Features list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-lg">
        {FEATURES.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
            <CheckCircle size={18} className="text-amber-400 flex-shrink-0"/>
            <span className="text-sm text-white/90">{he ? f.he : f.ru}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link href="/demo/register"
        className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500
          text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-amber hover:scale-105
          transition-all duration-300 active:scale-100 mb-6">
        <Sparkles size={22}/>
        {he ? 'להרשמה ותחילת עבודה' : 'Зарегистрироваться и начать'}
        {dir === 'rtl' ? <ChevronRight size={22} className="rotate-180"/> : <ChevronRight size={22}/>}
      </Link>

      {/* Pricing hint */}
      <p className="text-white/50 text-sm text-center mb-8">
        {he ? `₪1,500 הגדרה חד-פעמית + ₪50/חודש לכל מודול`
             : `₪1,500 разовая настройка + ₪50/мес за каждый модуль`}
      </p>

      {/* WhatsApp contact */}
      <a href="https://wa.me/972544858586" target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors text-sm">
        <MessageCircle size={18}/>
        {he ? 'שאלות? דברו איתנו ב-WhatsApp' : 'Вопросы? Пишите нам в WhatsApp'}
      </a>

      <style jsx global>{`
        .shadow-amber { box-shadow: 0 0 40px rgba(245,158,11,0.4); }
      `}</style>
    </div>
  )
}
