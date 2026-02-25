'use client'

import { useState, ReactNode } from 'react'
import { X } from 'lucide-react'

interface TrinityCardPcProps {
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'

  // Левая панель (30%)
  leftHeader?: ReactNode // Аватар + имя + badge
  leftActions?: ReactNode // Кнопки (звонок, WhatsApp, email)
  leftFields?: {
    // Поля данных
    label: string
    value: string | ReactNode
    dir?: 'ltr' | 'rtl'
  }[]
  leftFooter?: ReactNode // Кнопка Edit и т.д.
  leftEditForm?: ReactNode // Форма редактирования (заменяет leftFields)
  isEditing?: boolean

  // Правая панель (70%)
  rightKpi?: {
    // KPI заголовок
    label: string
    value: string
  }
  tabs?: {
    key: string
    label: string
    icon?: ReactNode
    content: ReactNode
  }[]
  defaultTab?: string

  // Стилизация
  maxWidth?: string // default: max-w-5xl
}

export function TrinityCardPc({
  isOpen,
  onClose,
  locale,
  leftHeader,
  leftActions,
  leftFields,
  leftFooter,
  leftEditForm,
  isEditing = false,
  rightKpi,
  tabs,
  defaultTab,
  maxWidth = 'max-w-5xl',
}: TrinityCardPcProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.key || '')
  const isRTL = locale === 'he'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className={`relative z-10 bg-background shadow-2xl flex h-full w-full ${maxWidth} mx-auto my-4 rounded-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ === */}
        <div className="p-6 flex flex-col border-e border-muted bg-muted/20 overflow-y-auto">
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground transition"
          >
            <X size={20} />
          </button>

          {/* Header (аватар, имя) */}
          {leftHeader && <div className="flex flex-col items-center mb-6">{leftHeader}</div>}

          {/* Быстрые действия */}
          {leftActions && <div className="flex justify-center gap-3 mb-6">{leftActions}</div>}

          {/* Данные или форма редактирования */}
          {isEditing && leftEditForm ? (
            <div className="flex-1">{leftEditForm}</div>
          ) : (
            <div className="space-y-3 flex-1">
              {leftFields?.map((field, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="font-medium" dir={field.dir}>
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer (Edit кнопка) */}
          {leftFooter && <div className="mt-4">{leftFooter}</div>}
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ === */}
        <div className="flex flex-col">
          {/* KPI заголовок */}
          {rightKpi && (
            <div className="px-6 py-4 border-b border-muted">
              <p className="text-sm text-muted-foreground">{rightKpi.label}</p>
              <p className="text-2xl font-bold">{rightKpi.value}</p>
            </div>
          )}

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex border-b border-muted px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tabs?.find((t) => t.key === activeTab)?.content}
          </div>
        </div>
      </div>
    </div>
  )
}
