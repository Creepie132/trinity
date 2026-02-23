'use client'

import { useState } from 'react'
import { ChevronRight, Mail, Phone, Calendar } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Button } from './button'
import { Badge } from './badge'

export interface DataField {
  key: string
  label: string
  value: string | React.ReactNode
  type?: 'text' | 'badge' | 'date' | 'email' | 'phone' | 'action'
  color?: string // для badge
  compact?: boolean // показывать в компактном виде карточки
  icon?: React.ReactNode
}

interface TrinityDataCardProps {
  title: string
  subtitle?: string
  fields: DataField[]
  actions?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline'
  }[]
  badge?: { text: string; color: string }
  onClick?: () => void
}

export function TrinityDataCard({
  title,
  subtitle,
  fields,
  actions,
  badge,
  onClick,
}: TrinityDataCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Компактные поля — показываются на карточке
  const compactFields = fields.filter((f) => f.compact)

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    } else {
      setIsOpen(true)
    }
  }

  const renderFieldValue = (field: DataField) => {
    switch (field.type) {
      case 'badge':
        return (
          <Badge
            className={`bg-${field.color || 'gray'}-100 text-${
              field.color || 'gray'
            }-700 dark:bg-${field.color || 'gray'}-900/30 dark:text-${
              field.color || 'gray'
            }-400`}
          >
            {field.value}
          </Badge>
        )
      case 'email':
        return (
          <a
            href={`mailto:${field.value}`}
            className="text-blue-600 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={14} />
            {field.value}
          </a>
        )
      case 'phone':
        return (
          <a
            href={`tel:${field.value}`}
            className="text-blue-600 hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={14} />
            {field.value}
          </a>
        )
      case 'date':
        return (
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-muted-foreground" />
            {field.value}
          </div>
        )
      default:
        return field.value
    }
  }

  const getBadgeColor = (color: string) => {
    const colors: Record<string, string> = {
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    }
    return colors[color] || colors.gray
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-card border rounded-xl p-4 mb-3 active:bg-muted/50 transition cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{title}</h4>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(badge.color)}`}>
                  {badge.text}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
            {compactFields.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {compactFields.map((f) => (
                  <span key={f.key} className="text-xs text-muted-foreground">
                    {f.icon && <span className="inline-block mr-1">{f.icon}</span>}
                    {f.value}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ChevronRight className="text-muted-foreground ml-2 flex-shrink-0" size={20} />
        </div>
      </div>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        {badge && (
          <span
            className={`inline-block text-sm px-3 py-1 rounded-full mb-4 ${getBadgeColor(badge.color)}`}
          >
            {badge.text}
          </span>
        )}

        {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}

        {/* All fields */}
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="border-b pb-3 last:border-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {field.label}
              </label>
              <div className="mt-1 text-sm">{renderFieldValue(field)}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-col gap-2 mt-6 pt-4 border-t">
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || 'default'}
                onClick={() => {
                  action.onClick()
                  setIsOpen(false)
                }}
                className="w-full"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
