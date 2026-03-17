'use client'

import Link from 'next/link'
import { Settings, Package, Image as ImageIcon, Sliders, MessageCircle, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminSettingsPage() {
  const { language } = useLanguage()
  const l = language === 'he'

  const sections = [
    {
      href: '/admin/plans-editor',
      icon: Package,
      iconBg: 'bg-purple-100 group-hover:bg-purple-200',
      iconColor: 'text-purple-600',
      title: l ? 'עורך כרטיסי תוכניות' : 'Редактор карточек планов',
      desc: l ? 'ניהול כרטיסי תמחור בלנדינג' : 'Управление тарифными карточками',
    },
    {
      href: '/admin/landing-media',
      icon: ImageIcon,
      iconBg: 'bg-blue-100 group-hover:bg-blue-200',
      iconColor: 'text-blue-600',
      title: l ? 'מדיה לנדינג' : 'Медиа лендинга',
      desc: l ? 'עדכון צילומי מסך בגלריה' : 'Замена скриншотов в галерее',
    },
    {
      href: '/admin/settings/pricing',
      icon: Sliders,
      iconBg: 'bg-amber-100 group-hover:bg-amber-200',
      iconColor: 'text-amber-600',
      title: l ? 'פרמטרי תמחור דמו' : 'Параметры ценообразования',
      desc: l ? 'מחירי מודולים והנחות' : 'Цены модулей и скидки',
    },
    {
      href: '/admin/whatsapp',
      icon: MessageCircle,
      iconBg: 'bg-green-100 group-hover:bg-green-200',
      iconColor: 'text-green-600',
      title: 'WhatsApp',
      desc: l ? 'הגדרות Wati.io ותבניות' : 'Настройки Wati.io и шаблоны',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{l ? 'הגדרות מערכת' : 'Настройки системы'}</h1>
          <p className="text-sm text-slate-500">{l ? 'ניהול הגדרות ופרמטרים' : 'Управление настройками и параметрами'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className={`w-12 h-12 ${s.iconBg} rounded-xl flex items-center justify-center transition-colors flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
