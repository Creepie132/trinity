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

  // === Кастомный обработчик клика ===
  onClick?: () => void // если указан, вызывается вместо открытия drawer
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
  onClick,
}: TrinityCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isRTL = locale === 'he'

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    } else {
      setDrawerOpen(true)
    }
  }

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
        onClick={handleCardClick}
        className={`bg-card border rounded-xl mb-2 active:bg-muted/50 transition cursor-pointer ${
          isInactive ? 'opacity-50' : ''
        } ${highlightBorder ? `border-${highlightBorder}` : ''} ${cardClassName}`}
      >
        {avatar?.type === 'timeline' ? (
          // Timeline layout (визиты)
          <div className="flex items-stretch">
            {renderAvatar()}
            <div className="flex-1 py-3 px-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{title}</p>
                  {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {badge && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.text}</span>}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
              {price && <p className="text-xs font-medium text-primary mt-1">{price}</p>}
            </div>
          </div>
        ) : (
          // Standard layout (клиенты, платежи)
          <div className="p-4">
            <div className="flex items-center gap-3">
              {renderAvatar()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-base truncate">{title}</h4>
                  {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>{badge.text}</span>}
                </div>
                {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
              </div>
              <ChevronRight className="text-muted-foreground flex-shrink-0" size={18} />
            </div>

            {/* Stats Row */}
            {stats && stats.length > 0 && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-muted">
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {stat.icon}
                    <span>{stat.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {quickActions && quickActions.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                    className={`flex items-center justify-center w-9 h-9 rounded-full ${action.color} ${action.textColor} ${action.darkBg || ''} ${action.darkText || ''} hover:opacity-80 transition`}
                    title={action.label}
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== BOTTOM SHEET ===== */}
      <TrinityBottomDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle || title}
      >
        {/* Кастомный header */}
        {drawerHeader}

        {/* Кастомный контент ИЛИ автоматический из полей */}
        {drawerContent || (
          <>
            {/* Detail Fields */}
            {detailFields && (
              <div className="space-y-1">
                {detailFields.map((field, i) => (
                  <div
                    key={i}
                    className={`flex ${field.type === 'multiline' ? 'flex-col' : 'justify-between items-center'} py-2.5 border-b border-muted last:border-0`}
                  >
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                    {field.type === 'multiline' ? (
                      <p className="text-sm whitespace-pre-wrap break-words mt-1">{field.value}</p>
                    ) : (
                      <span className="text-sm font-medium text-end">{field.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Detail Actions */}
            {detailActions && detailActions.length > 0 && (
              <div className="mt-6 space-y-2">
                {detailActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      action.onClick()
                      setDrawerOpen(false)
                    }}
                    className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${action.className}`}
                  >
                    {action.icon}
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

// ============================================
// ХЕЛПЕРЫ
// ============================================

// Генератор цвета аватара по имени
export function getAvatarColor(name: string): string {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  return colors[(name || '').charCodeAt(0) % colors.length]
}

// Генератор инициалов
export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
