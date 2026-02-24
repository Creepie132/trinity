'use client'

import { useState, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'

// ============================================
// УНИВЕРСАЛЬНЫЙ ШАБЛОН КАРТОЧКИ TRINITY CRM
// Используй для любых списков: клиенты, визиты, платежи, инвентарь, абонементы
// ============================================

// ----- Типы -----
interface QuickAction {
  icon: ReactNode
  label: string
  onClick: () => void
  color: string // bg-blue-50, bg-green-50 и т.д.
  textColor: string // text-blue-600, text-green-600 и т.д.
  darkBg?: string // dark:bg-blue-900/30
  darkText?: string // dark:text-blue-400
}

interface DetailField {
  label: string
  value: string | ReactNode
  type?: 'text' | 'link' | 'badge' | 'multiline'
}

interface DetailAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  className: string // полный класс кнопки
}

interface TrinityCardProps {
  // === Левая часть (аватар / иконка) ===
  avatar?: {
    type: 'initials' | 'icon' | 'image' | 'timeline'
    // initials:
    text?: string
    color?: string
    // icon:
    icon?: ReactNode
    iconBg?: string
    // image:
    src?: string
    // timeline:
    topText?: string
    bottomText?: string
    timelineBg?: string
  }

  // === Центр (основная инфо) ===
  title: string
  subtitle?: string
  stats?: { icon: ReactNode; text: string }[]
  badge?: { text: string; className: string }
  price?: string

  // === Быстрые действия (кнопки-иконки) ===
  quickActions?: QuickAction[]

  // === Bottom Sheet детали ===
  drawerTitle?: string
  drawerHeader?: ReactNode // кастомный header в drawer
  detailFields?: DetailField[]
  detailActions?: DetailAction[]
  drawerContent?: ReactNode // полностью кастомный контент

  // === Стилизация ===
  cardClassName?: string // доп. классы карточки
  isInactive?: boolean // opacity-50
  highlightBorder?: string // border-amber-300 и т.д.
  locale?: 'he' | 'ru'
}

export function TrinityCard({
  avatar,
  title,
  subtitle,
  stats,
  badge,
  price,
  quickActions,
  drawerTitle,
  drawerHeader,
  detailFields,
  detailActions,
  drawerContent,
  cardClassName = '',
  isInactive = false,
  highlightBorder = '',
  locale = 'ru',
}: TrinityCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isRTL = locale === 'he'

  // ===== Рендер аватара =====
  function renderAvatar() {
    if (!avatar) return null

    switch (avatar.type) {
      case 'initials':
        return (
          <div className={`${avatar.color || 'bg-blue-500'} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {avatar.text}
          </div>
        )

      case 'icon':
        return (
          <div className={`${avatar.iconBg || 'bg-muted'} w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0`}>
            {avatar.icon}
          </div>
        )

      case 'image':
        return (
          <img src={avatar.src} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
        )

      case 'timeline':
        return (
          <div
            className={`flex flex-col items-center justify-center px-3 py-2 border-e ${avatar.timelineBg || 'bg-muted/30'} flex-shrink-0`}
            style={{ minWidth: 68 }}
          >
            <span className="text-lg font-bold">{avatar.topText}</span>
            {avatar.bottomText && (
              <span className="text-xs text-muted-foreground">{avatar.bottomText}</span>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* ===== КАРТОЧКА ===== */}
      <div
        onClick={() => setDrawerOpen(true)}
        className={`
          flex items-center gap-3 p-3 bg-background rounded-xl border 
          transition-all duration-200 cursor-pointer
          hover:shadow-md active:scale-[0.98]
          ${highlightBorder || 'border-border'}
          ${isInactive ? 'opacity-50' : ''}
          ${cardClassName}
        `}
      >
        {/* Аватар */}
        {renderAvatar()}

        {/* Основная информация */}
        <div className="flex-1 min-w-0">
          {/* Заголовок + Badge */}
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`font-semibold text-sm truncate ${isRTL ? 'text-right' : 'text-left'}`}>
              {title}
            </h3>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}>
                {badge.text}
              </span>
            )}
          </div>

          {/* Подзаголовок */}
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}

          {/* Статистика (иконки + текст) */}
          {stats && stats.length > 0 && (
            <div className="flex items-center gap-3 mt-1">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stat.icon}
                  <span>{stat.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Цена (справа) */}
        {price && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-foreground">{price}</p>
          </div>
        )}

        {/* Стрелка */}
        <ChevronRight size={18} className={`text-muted-foreground flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
      </div>

      {/* ===== BOTTOM DRAWER ===== */}
      <TrinityBottomDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle || title}
      >
        {/* Кастомный header */}
        {drawerHeader && <div className="mb-4">{drawerHeader}</div>}

        {/* Полностью кастомный контент */}
        {drawerContent ? (
          drawerContent
        ) : (
          <>
            {/* Поля деталей */}
            {detailFields && detailFields.length > 0 && (
              <div className="space-y-3 mb-6">
                {detailFields.map((field, index) => (
                  <div key={index}>
                    <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                    {field.type === 'link' ? (
                      <a href={field.value as string} className="text-sm text-blue-600 underline">
                        {field.value}
                      </a>
                    ) : field.type === 'badge' ? (
                      <span className="text-sm">{field.value}</span>
                    ) : field.type === 'multiline' ? (
                      <p className="text-sm whitespace-pre-wrap">{field.value}</p>
                    ) : (
                      <p className="text-sm font-medium">{field.value}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Быстрые действия (внутри drawer) */}
            {quickActions && quickActions.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick()
                      setDrawerOpen(false)
                    }}
                    className={`${action.color} ${action.darkBg || ''} ${action.textColor} ${action.darkText || ''} flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Дополнительные действия */}
            {detailActions && detailActions.length > 0 && (
              <div className="space-y-2">
                {detailActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick()
                      setDrawerOpen(false)
                    }}
                    className={action.className}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </TrinityBottomDrawer>
    </>
  )
}
