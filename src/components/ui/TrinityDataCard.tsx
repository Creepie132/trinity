'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

interface Badge {
  text: string
  color: 'gray' | 'yellow' | 'green' | 'blue' | 'red'
}

interface Field {
  key: string
  label: string
  value: React.ReactNode
  compact?: boolean
}

interface Action {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface TrinityDataCardProps {
  title: string
  subtitle?: string
  badge?: Badge
  fields: Field[]
  actions?: Action[]
}

const badgeColors = {
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
}

export function TrinityDataCard({ title, subtitle, badge, fields, actions }: TrinityDataCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Compact fields shown in card
  const compactFields = fields.filter(f => f.compact)
  
  // All fields shown in bottom sheet
  const allFields = fields

  return (
    <>
      {/* Card */}
      <div
        onClick={() => setIsOpen(true)}
        className="bg-card border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          {badge && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ms-2 ${badgeColors[badge.color]}`}>
              {badge.text}
            </span>
          )}
        </div>

        {/* Compact Fields */}
        {compactFields.length > 0 && (
          <div className="space-y-2 mb-3">
            {compactFields.map(f => (
              <div key={f.key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end text-primary text-sm font-medium">
          <span className="me-1">פרטים</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        {subtitle && <p className="text-muted-foreground mb-4">{subtitle}</p>}
        
        {badge && (
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mb-4 ${badgeColors[badge.color]}`}>
            {badge.text}
          </span>
        )}

        <div className="space-y-3">
          {allFields.map(f => (
            <div key={f.key} className="flex justify-between items-start py-2 border-b border-muted last:border-0">
              <span className="text-sm text-muted-foreground">{f.label}</span>
              <span className="text-sm font-medium text-end max-w-[60%]">{f.value}</span>
            </div>
          ))}
        </div>

        {actions && actions.length > 0 && (
          <div className="mt-6 space-y-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick()
                  setIsOpen(false)
                }}
                className={`w-full py-3 rounded-xl font-medium transition ${
                  action.variant === 'destructive'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
