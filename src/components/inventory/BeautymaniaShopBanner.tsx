'use client'

import { useState } from 'react'
import { X, Globe, Camera, FileText, ShoppingBag, Sparkles } from 'lucide-react'

interface BeautymaniaShopBannerProps {
  locale: string
}

export function BeautymaniaShopBanner({ locale }: BeautymaniaShopBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('bm_shop_banner_dismissed') === '1'
  })

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('bm_shop_banner_dismissed', '1')
    setDismissed(true)
  }

  const l = locale === 'he'

  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1108] to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,168,76,0.15)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(201,168,76,0.08)_0%,_transparent_60%)]" />

      {/* Gold border */}
      <div className="absolute inset-0 rounded-3xl border border-[rgba(201,168,76,0.25)]" />

      {/* Decorative dots */}
      <div className="absolute top-4 right-16 w-1 h-1 rounded-full bg-[#c9a84c] opacity-40" />
      <div className="absolute top-8 right-24 w-0.5 h-0.5 rounded-full bg-[#c9a84c] opacity-30" />
      <div className="absolute bottom-6 left-24 w-1 h-1 rounded-full bg-[#c9a84c] opacity-20" />

      <div className="relative z-10 p-5">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center
            bg-white/5 hover:bg-white/10 text-[#c8c2b8] hover:text-white transition-colors"
        >
          <X size={13} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)]
            flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={16} className="text-[#c9a84c]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#c9a84c]">
                beautymania.co.il
              </p>
              <span className="flex items-center gap-1 bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.2)]
                text-[#c9a84c] text-[10px] px-2 py-0.5 rounded-full font-medium">
                <Globe size={9} />
                {l ? 'חנות חיה' : 'Магазин онлайн'}
              </span>
            </div>
            <h3 className="text-white font-semibold text-sm mt-0.5">
              {l
                ? 'המוצרים שלך מופיעים באתר בזמן אמת'
                : 'Ваши товары отображаются на сайте в реальном времени'}
            </h3>
          </div>
        </div>

        {/* Tips grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

          <div className="flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.06] rounded-2xl p-3.5
            border border-white/[0.06] transition-colors">
            <div className="w-8 h-8 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera size={14} className="text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-0.5">
                {l ? 'תמונה = יותר מכירות' : 'Фото = больше продаж'}
              </p>
              <p className="text-[#8a8078] text-[11px] leading-relaxed">
                {l
                  ? 'הוסף תמונה ברורה לכל מוצר. לחץ על המוצר ← "ערוך" ← העלה תמונה'
                  : 'Добавь чёткое фото к каждому товару. Нажми на товар → «Ред.» → загрузи фото'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.06] rounded-2xl p-3.5
            border border-white/[0.06] transition-colors">
            <div className="w-8 h-8 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={14} className="text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-0.5">
                {l ? 'תיאור מוכר' : 'Описание продаёт'}
              </p>
              <p className="text-[#8a8078] text-[11px] leading-relaxed">
                {l
                  ? 'כתבי תיאור קצר ומושך — לקוחות רואים אותו על האתר לפני הרכישה'
                  : 'Напиши короткое привлекательное описание — клиенты видят его на сайте перед покупкой'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/[0.04] hover:bg-white/[0.06] rounded-2xl p-3.5
            border border-white/[0.06] transition-colors">
            <div className="w-8 h-8 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={14} className="text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-0.5">
                {l ? 'רק מוצרים במלאי' : 'Только товары в наличии'}
              </p>
              <p className="text-[#8a8078] text-[11px] leading-relaxed">
                {l
                  ? 'רק מוצרים עם כמות > 0 מוצגים. עדכן כמות ← המוצר יופיע/יוסתר אוטומטית'
                  : 'Только товары с остатком > 0 показываются. Обнови количество — товар появится / скроется сам'}
              </p>
            </div>
          </div>

        </div>

        {/* Footer link */}
        <div className="mt-3.5 flex items-center justify-between">
          <p className="text-[#4a453e] text-[11px]">
            {l ? '* שינויים מופיעים תוך דקה' : '* Изменения появляются на сайте в течение минуты'}
          </p>
          <a
            href="https://beautymania.co.il/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#c9a84c] hover:text-[#e8c97a] text-[11px] font-medium
              tracking-[0.08em] transition-colors group"
          >
            <Globe size={11} />
            {l ? 'צפה בחנות' : 'Открыть магазин'}
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
